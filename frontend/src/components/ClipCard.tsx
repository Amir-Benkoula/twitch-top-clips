import { useState } from 'react';
import axios from 'axios';
import type { Clip } from '../types';
import { UploadModal } from './UploadModal';

interface ClipCardProps {
  clip: Clip;
  isGenerated?: boolean;
}

export const ClipCard = ({ clip, isGenerated }: ClipCardProps) => {
  const [downloading, setDownloading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [fileUrl, setFileUrl] = useState('');

  const handleUploadClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (downloading) return;

    setDownloading(true);
    try {
      const response = await axios.post('http://localhost:3000/api/download', {
        url: clip.url,
        thumbnail_url: clip.thumbnail_url,
        id: clip.id,
      });

      if (response.data.success) {
        setFileUrl(response.data.file_url);
        setShowModal(true);
      } else {
        alert('Erreur: ' + response.data.error);
      }
    } catch (err: any) {
      console.error(err);
      alert('Erreur de téléchargement: ' + (err.response?.data?.error || err.message));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <div className="clip-card-container">
        <a 
          href={clip.url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="clip-card"
          style={isGenerated ? { border: '2px solid #00e676' } : {}}
        >

          <div className="thumbnail-container">
            <img src={clip.thumbnail_url} alt={clip.title} loading="lazy" />
            <span className="views-badge">
              {new Intl.NumberFormat('fr-FR', { notation: "compact" }).format(clip.view_count)} vues
            </span>
            <span className="duration-badge">
              {Math.round(clip.duration)}s
            </span>
          </div>
          <div className="clip-info">
            <h4 title={clip.title}>{clip.title}</h4>
            <span className="clip-date">
              {new Date(clip.created_at).toLocaleDateString()}
            </span>
          </div>
        </a>
        <div className="action-bar">
          <button 
            className={`upload-btn ${downloading ? 'loading' : ''}`} 
            onClick={handleUploadClick}
            disabled={downloading}
          >
            {downloading ? 'Téléchargement...' : 'Upload TikTok 🎵'}
          </button>
        </div>
      </div>
      
      {showModal && (
        <UploadModal 
          isOpen={showModal} 
          onClose={() => setShowModal(false)} 
          clip={clip} 
          fileUrl={fileUrl} 
        />
      )}
    </>
  );
};
