import { useState, useEffect } from 'react';
import axios from 'axios';
import { GameSection } from './components/GameSection';
import { StreamerSection } from './components/StreamerSection';
import { GeneratedClipsSection } from './components/GeneratedClipsSection';
import type { GameData, StreamerData, GeneratedClip, ApiResponse } from './types';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState<'games' | 'streamers' | 'generated'>('games');
  
  const [games, setGames] = useState<GameData[]>([]);
  const [selectedGames, setSelectedGames] = useState<Set<string>>(new Set());
  const [streamers, setStreamers] = useState<StreamerData[]>([]);
  const [selectedStreamers, setSelectedStreamers] = useState<Set<string>>(new Set());
  const [generatedClips, setGeneratedClips] = useState<GeneratedClip[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Computed set of generated clip IDs for fast lookup
  const generatedClipIds = new Set(generatedClips.map(c => c.filename.replace('_montage.mp4', '')));

  // Initial fetch of generated clips to populate the "Already Generated" status
  useEffect(() => {
      fetchClips('generated');
  }, []);

  const fetchClips = async (type: 'games' | 'streamers' | 'generated') => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = '';
      if (type === 'games') endpoint = 'http://localhost:3000/api/top-streams';
      else if (type === 'streamers') endpoint = 'http://localhost:3000/api/top-streamers';
      else endpoint = 'http://localhost:3000/api/generated-clips';
        
      const response = await axios.get<ApiResponse>(endpoint);
      
      if (response.data.success) {
        if (type === 'games') {
            setGames(response.data.data as GameData[]);
        } else if (type === 'streamers') {
            setStreamers(response.data.data as StreamerData[]);
        } else {
            setGeneratedClips(response.data.data as GeneratedClip[]);
        }
      } else {
        setError('Impossible de récupérer les données.');
      }
    } catch (err) {
      console.error(err);
      setError('Erreur lors de la connexion au serveur.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load or tab switch? Let's just create a wrapper function
  const handleTabChange = (tab: 'games' | 'streamers' | 'generated') => {
      setActiveTab(tab);
      // Optional: Auto fetch if empty?
      if (tab === 'games' && games.length === 0) fetchClips('games');
      if (tab === 'streamers' && streamers.length === 0) fetchClips('streamers');
      if (tab === 'generated') fetchClips('generated'); // Always refresh generated list to see new ones
  };

  const handleDeleteClip = async (filename: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce montage et ses fichiers sources ?')) return;

    try {
        const response = await axios.delete(`http://localhost:3000/api/generated-clips/${filename}`);
        if (response.data.success) {
            // Remove from state immediately
            setGeneratedClips(prev => prev.filter(c => c.filename !== filename));
        } else {
            alert('Erreur: ' + response.data.error);
        }
    } catch (err) {
        console.error(err);
        alert('Erreur lors de la suppression.');
    }
  };

  return (
    <div className="app-container">
      <header className="header" style={{ flexDirection: 'column', gap: '20px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <h1>Twitch Top FR Clips</h1>
            <button onClick={() => fetchClips(activeTab)} disabled={loading}>
            {loading ? 'Actualiser...' : 'Actualiser'}
            </button>
        </div>
        
        {/* TAB NAVIGATION */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button 
                className={activeTab === 'games' ? 'active-tab' : 'inactive-tab'}
                onClick={() => handleTabChange('games')}
                style={{
                  background: activeTab === 'games' ? '#9146FF' : 'transparent',
                  border: '1px solid #9146FF',
                  padding: '8px 20px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  color: '#fff'
                }}
            >
                🎮 Par Jeux
            </button>
            <button 
                className={activeTab === 'streamers' ? 'active-tab' : 'inactive-tab'}
                onClick={() => handleTabChange('streamers')}
                style={{
                  background: activeTab === 'streamers' ? '#e91e63' : 'transparent',
                  border: '1px solid #e91e63',
                  padding: '8px 20px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  color: '#fff'
                }}
            >
                🎙️ Par Streamers
            </button>
            <button 
                className={activeTab === 'generated' ? 'active-tab' : 'inactive-tab'}
                onClick={() => handleTabChange('generated')}
                style={{
                  background: activeTab === 'generated' ? '#00e676' : 'transparent',
                  border: '1px solid #00e676',
                  padding: '8px 20px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  color: '#fff'
                }}
            >
                🎬 Mes Montages
            </button>
        </div>
      </header>

      {error && <div className="error">{error}</div>}
      
      {/* GAMES VIEW */}
      {activeTab === 'games' && (
          <>
            {games.length === 0 && !loading && !error && (
                <div className="loading">Cliquez sur Actualiser pour voir les clips par jeux.</div>
            )}

            {games.length > 0 && (
                <div className="game-filters" style={{ 
                    display: 'flex', 
                    gap: '10px', 
                    overflowX: 'auto', 
                    padding: '10px 0', 
                    marginBottom: '20px',
                    scrollbarWidth: 'thin'
                }}>
                    <button
                        onClick={() => setSelectedGames(new Set())}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid #9146FF',
                            background: selectedGames.size === 0 ? '#9146FF' : 'transparent',
                            color: '#fff',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            height: 'fit-content',
                            alignSelf: 'center'
                        }}
                    >
                        Tous
                    </button>
                    {games.map(g => {
                        const boxArt = g.game_info.box_art_url.replace('{width}', '40').replace('{height}', '54');
                        return (
                            <button
                                key={g.game_info.id}
                                onClick={() => {
                                    const newSet = new Set(selectedGames);
                                    if (newSet.has(g.game_info.id)) {
                                        newSet.delete(g.game_info.id);
                                    } else {
                                        newSet.add(g.game_info.id);
                                    }
                                    setSelectedGames(newSet);
                                }}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px',
                                    borderRadius: '8px',
                                    border: `1px solid ${selectedGames.has(g.game_info.id) ? '#9146FF' : 'transparent'}`,
                                    background: selectedGames.has(g.game_info.id) ? 'rgba(145, 70, 255, 0.2)' : 'transparent',
                                    cursor: 'pointer',
                                    minWidth: '60px'
                                }}
                                title={g.game_info.name}
                            >
                                <img 
                                    src={boxArt} 
                                    alt={g.game_info.name} 
                                    style={{ borderRadius: '4px' }}
                                />
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="streams-list">
                {games
                    .filter(g => selectedGames.size === 0 || selectedGames.has(g.game_info.id))
                    .map((game) => (
                    <GameSection 
                        key={game.game_info.id} 
                        data={game} 
                        generatedClipIds={generatedClipIds}
                    />
                ))}
            </div>
          </>
      )}

      {/* STREAMERS VIEW */}
      {activeTab === 'streamers' && (
          <>
             {streamers.length === 0 && !loading && !error && (
                <div className="loading">Cliquez sur Actualiser pour voir les clips des Top Streamers FR.</div>
            )}
            
            {streamers.length > 0 && (
                <div className="streamer-filters" style={{ 
                    display: 'flex', 
                    gap: '10px', 
                    overflowX: 'auto', 
                    padding: '10px 0', 
                    marginBottom: '20px',
                    scrollbarWidth: 'thin'
                }}>
                    <button
                        onClick={() => setSelectedStreamers(new Set())}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            border: '1px solid #e91e63',
                            background: selectedStreamers.size === 0 ? '#e91e63' : 'transparent',
                            color: '#fff',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Tous
                    </button>
                    {streamers.map(s => (
                        <button
                            key={s.streamer_info.id}
                            onClick={() => {
                                const newSet = new Set(selectedStreamers);
                                if (newSet.has(s.streamer_info.id)) {
                                    newSet.delete(s.streamer_info.id);
                                } else {
                                    newSet.add(s.streamer_info.id);
                                }
                                setSelectedStreamers(newSet);
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '4px 12px 4px 4px',
                                borderRadius: '20px',
                                border: `1px solid ${selectedStreamers.has(s.streamer_info.id) ? '#e91e63' : '#333'}`,
                                background: selectedStreamers.has(s.streamer_info.id) ? 'rgba(233, 30, 99, 0.2)' : '#18181b',
                                color: '#fff',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <img 
                                src={s.streamer_info.profile_image_url} 
                                alt="" 
                                style={{ width: '24px', height: '24px', borderRadius: '50%' }}
                            />
                            {s.streamer_info.name}
                        </button>
                    ))}
                </div>
            )}

            <div className="streams-list">
                {streamers
                    .filter(s => selectedStreamers.size === 0 || selectedStreamers.has(s.streamer_info.id))
                    .map((streamer) => (
                    <StreamerSection 
                        key={streamer.streamer_info.id} 
                        data={streamer} 
                        generatedClipIds={generatedClipIds}
                    />
                ))}
            </div>
          </>
      )}

      {/* GENERATED VIEW */}
      {activeTab === 'generated' && (
          <GeneratedClipsSection clips={generatedClips} onDelete={handleDeleteClip} />
      )}
    </div>
  );
}

export default App;
