import { useState } from 'react';
import type { StreamerData } from '../types';
import { ClipCard } from './ClipCard';

interface StreamerSectionProps {
  data: StreamerData;
  generatedClipIds: Set<string>;
}

export const StreamerSection = ({ data, generatedClipIds }: StreamerSectionProps) => {
  const { streamer_info, top_clips } = data;
  const [sortBy, setSortBy] = useState<'views' | 'status' | 'duration'>('views');

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
          <img 
            src={streamer_info.profile_image_url} 
            alt={streamer_info.name} 
            style={{ 
                borderRadius: '50%', // Round avatar for pros
                width: '60px', 
                height: '60px',
                border: '2px solid #9146FF'
            }} 
          />
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{streamer_info.name}</h3>
            <span style={{ fontSize: '0.8rem', color: '#adadb8', opacity: 0.8 }}>@{streamer_info.login}</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div className="live-badge" style={{ backgroundColor: '#e91e63' }}>
            {top_clips.length} Clips
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
