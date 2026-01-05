import type { GeneratedClip } from '../types';

interface GeneratedClipsListProps {
  clips: GeneratedClip[];
  onDelete: (filename: string) => void;
}

export const GeneratedClipsSection = ({ clips, onDelete }: GeneratedClipsListProps) => {
  return (
    <div className="stream-section">
      <div className="stream-header">
        <h3>🎬 Mes Montages ({clips.length})</h3>
      </div>
      
      {clips.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#adadb8', background: '#18181b', borderRadius: '8px' }}>
              Aucun montage généré pour le moment. Créez-en un à partir des onglets Jeux ou Streamers !
          </div>
      ) : (
        <div className="clips-grid" style={{ marginTop: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {clips.map(clip => (
            <div key={clip.filename} className="clip-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="thumbnail-container" style={{ aspectRatio: '9/16', background: '#000' }}>
                    <video 
                        src={clip.url} 
                        controls 
                        preload="metadata"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                </div>
                <div className="clip-info" style={{ marginTop: 'auto' }}>
                    <div className="clip-title" style={{ fontSize: '0.9rem', marginBottom: '5px' }}>
                        {clip.filename.replace('_montage.mp4', '')}
                    </div>
                    <div className="clip-meta">
                        {new Date(clip.createdAt).toLocaleString()}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                        <a 
                            href={clip.url} 
                            download 
                            className="btn-primary" 
                            style={{ 
                                flex: 1,
                                display: 'block', 
                                textAlign: 'center', 
                                padding: '8px', 
                                textDecoration: 'none',
                                fontSize: '0.9rem'
                            }}
                        >
                            ⬇️ DL
                        </a>
                        <button 
                            onClick={() => onDelete(clip.filename)}
                            style={{
                                background: 'rgba(255, 68, 68, 0.1)',
                                border: '1px solid #ff4444',
                                color: '#ff6666',
                                borderRadius: '4px',
                                padding: '0 12px',
                                cursor: 'pointer',
                                fontSize: '1.2rem'
                            }}
                            title="Supprimer définitivement"
                        >
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
            ))}
        </div>
      )}
    </div>
  );
};
