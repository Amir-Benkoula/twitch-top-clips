import { useState } from 'react';
import type { GameData } from '../types';
import { ClipCard } from './ClipCard';

interface GameSectionProps {
  data: GameData;
  generatedClipIds: Set<string>;
}

export const GameSection = ({ data, generatedClipIds }: GameSectionProps) => {
  const { game_info, top_clips } = data;
  const [sortBy, setSortBy] = useState<'views' | 'status' | 'duration'>('views');

  // Replace {width}x{height} in box art url
  const boxArtUrl = game_info.box_art_url.replace('{width}', '52').replace('{height}', '72');

  const sortedClips = [...top_clips].sort((a, b) => {
      if (sortBy === 'status') {
          const aGen = generatedClipIds.has(a.id);
          const bGen = generatedClipIds.has(b.id);
          if (aGen && !bGen) return -1;
          if (!aGen && bGen) return 1;
      }
      if (sortBy === 'duration') {
          return b.duration - a.duration;
      }
      return b.view_count - a.view_count; // Fallback to views
  });

  return (
    <div className="stream-section">
      <div className="stream-header" style={{ alignItems: 'center', justifyContent: 'space-between', display: 'flex' }}>
        <div className="stream-meta" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src={boxArtUrl} alt={game_info.name} style={{ borderRadius: '4px' }} />
          <h3>{game_info.name}</h3>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div className="live-badge" style={{ backgroundColor: '#9146FF' }}>
            {top_clips.length} Clips FR
            </div>
            
            <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as 'views' | 'status' | 'duration')}
                style={{
                    background: '#18181b',
                    color: '#fff',
                    border: '1px solid #333',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.9rem'
                }}
            >
                <option value="views">Trier par: Vues</option>
                <option value="status">Trier par: Généré</option>
                <option value="duration">Trier par: Durée</option>
            </select>
        </div>
      </div>
      
      <div className="clips-grid" style={{ marginTop: '1.5rem' }}>
        {sortedClips.map(clip => (
          <ClipCard 
            key={clip.id} 
            clip={clip} 
            isGenerated={generatedClipIds.has(clip.id)}
          />
        ))}
      </div>
    </div>
  );
};
