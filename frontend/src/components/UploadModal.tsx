import { useState, useRef, useEffect } from 'react';
import type { Clip } from '../types';
import { CropBoxSelector } from './CropBoxSelector';
import { MontagePreview } from './MontagePreview';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  clip: Clip;
  fileUrl: string;
}

export const UploadModal = ({ isOpen, onClose, clip, fileUrl }: UploadModalProps) => {
  // Video state
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [videoResolution, setVideoResolution] = useState({ width: 1920, height: 1080 }); // Default to FHD but update on load
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  // Montage Settings
  const [montageStyle, setMontageStyle] = useState<'blur' | 'split'>('blur');
  const [facecamCrop, setFacecamCrop] = useState({ x: 0, y: 0, width: 0, height: 0 }); // Will init on load
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Overlay Positions (Normalized 0-1)
  const [titlePos, setTitlePos] = useState({ x: 0.5, y: 0.2 }); // Top-ish
  const [badgePos, setBadgePos] = useState({ x: 0.5, y: 0.8 }); // Bottom-ish

  const [isGenerating, setIsGenerating] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState(fileUrl);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Load video metadata and init defaults
  const handleVideoLoad = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const vid = e.currentTarget;
    setDuration(vid.duration);
    setEndTime(vid.duration); // Default to full clip
    setVideoResolution({ width: vid.videoWidth, height: vid.videoHeight });
    
    // Default Facecam Crop (Center-Top, approx 30% width, keeping safe ratio)
    // Safe Ratio = 1080/768 ~ 1.406
    const defW = Math.round(vid.videoWidth * 0.3); // 30% width
    const defH = Math.round(defW / (1080/768));
    
    setFacecamCrop({
        x: Math.round((vid.videoWidth - defW) / 2),
        y: Math.round(vid.videoHeight * 0.1), // 10% from top
        width: defW,
        height: defH
    });
  };

  // Check if we are viewing the generated result
  const isGeneratedView = currentVideoUrl.includes('_montage.mp4');

  // Sync currentVideoUrl with fileUrl prop if it changes and we're not generating/viewing a generated video
  if (fileUrl !== currentVideoUrl && !isGenerating && !isGeneratedView) {
      setCurrentVideoUrl(fileUrl);
  }

  if (!isOpen) return null;

  // TikTok Auth State
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Check connectivity on mount
  useEffect(() => {
    fetch('http://localhost:3000/api/auth/tiktok/status')
      .then(res => res.json())
      .then(data => setTiktokConnected(data.isAuthenticated))
      .catch(err => console.error("Failed to check TikTok status", err));
  }, [isOpen]);

  const handleConnectTikTok = () => {
    fetch('http://localhost:3000/api/auth/tiktok')
      .then(res => res.json())
      .then(data => {
          if(data.url) window.location.href = data.url;
      })
      .catch(err => alert("Erreur de connexion TikTok: " + err.message));
  };
  
  const handlePublish = async () => {
    if (!isGeneratedView) {
      setError('⚠️ Veuillez générer un montage avant de publier.');
      return;
    }
    
    if (!tiktokConnected) {
        if (confirm("Vous n'êtes pas connecté à TikTok. Voulez-vous vous connecter ?")) {
            handleConnectTikTok();
        }
        return;
    }

    setPublishing(true);
    try {
        const response = await fetch('http://localhost:3000/api/upload/tiktok', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filePath: currentVideoUrl, // Sends the relative path/url from frontend state
                title: `${title} #TwitchClips #FYP` // Add hashtags automatically
            })
        });
        
        const data = await response.json();
        if (data.success) {
            alert("✅ Vidéo publiée sur TikTok avec succès !");
            onClose();
        } else {
            throw new Error(data.error || "Erreur inconnue");
        }
    } catch (err: any) {
        alert("❌ Erreur de publication: " + err.message);
    } finally {
        setPublishing(false);
    }
  };

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setProgress(0);
    setError('❌ Génération annulée');
  };

  const handleGenerateMontage = async () => {
      if (!title.trim()) {
          setError('⚠️ Veuillez entrer un titre pour votre montage.');
          return;
      }

      setIsGenerating(true);
      setError(null);
      setProgress(0);
      
      // Create abort controller
      abortControllerRef.current = new AbortController();
      
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          // Asymptotic progress simulation
          // Fast start (0-30), Medium (30-60), Slow (60-80), Crawl (80-99)
          let increment = 0;
          if (prev < 30) increment = Math.random() * 5 + 2;      // Fast
          else if (prev < 60) increment = Math.random() * 2 + 1; // Medium
          else if (prev < 80) increment = Math.random() * 1 + 0.5; // Slow
          else if (prev < 95) increment = 0.1;                   // Crawl (waiting for server)
          
          return Math.min(prev + increment, 99);
        });
      }, 500);

      try {
          const body: any = {
              clipId: clip.id,
              title: title,
              clipPath: fileUrl, // Always use original file as source
              streamerName: clip.broadcaster_name,
              montageStyle: montageStyle,
              startTime: startTime > 0 ? startTime : undefined,
              endTime: endTime < duration ? endTime : undefined
          };

          if (montageStyle === 'split') {
              body.facecamCrop = facecamCrop;
              body.titlePos = titlePos;
              body.badgePos = badgePos;
          }

          const response = await fetch('http://localhost:3000/api/generate-montage', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
              signal: abortControllerRef.current.signal
          });
          
          clearInterval(progressInterval);
          
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.error || `Erreur HTTP: ${response.status}`);
          }
          
          if (data.success) {
              setProgress(100);
              setCurrentVideoUrl(data.montage_url); // Correct property from backend
              setError(null);
          } else {
              throw new Error(data.error || 'Erreur inconnue');
          }
      } catch (err: any) {
          clearInterval(progressInterval);
          if (err.name === 'AbortError') {
            return;
          }
          console.error("Génération échouée:", err);
          setError(err.message || "Erreur lors de la génération");
          setIsGenerating(false);
          setProgress(0);
      } finally {
          setIsGenerating(false);
          abortControllerRef.current = null;
      }
  };


  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ 
        maxWidth: '1200px', 
        width: '95%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '0'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="modal-header" style={{ padding: '15px 20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>
             {isGeneratedView ? "🎉 Montage Prêt !" : "Montage Vidéo IA"}
          </h2>
          <button className="modal-close" onClick={onClose} style={{ position: 'static', transform: 'none' }}>×</button>
        </div>
        
        {/* Main Body (Row Layout) */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            
            {/* LEFT COLUMN: Source & Form */}
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto', borderRight: '1px solid #333' }}>
                
                <div className="form-group">
                    {/* Source Video Section */}
                    <div className="video-container" style={{ padding: '0', display: 'flex', justifyContent: 'center', backgroundColor: '#000', marginBottom: '20px' }}>
                    <div 
                        ref={videoContainerRef}
                        style={{ position: 'relative', width: '100%' }}
                    >
                        <video 
                        ref={videoRef}
                        key={currentVideoUrl} 
                        src={currentVideoUrl} 
                        onLoadedMetadata={handleVideoLoad}
                        controls 
                        autoPlay 
                        loop 
                        style={{ 
                            display: 'block', 
                            width: '100%',
                            height: 'auto',
                            borderRadius: '8px',
                            objectFit: 'contain',
                            maxHeight: '400px'
                        }} 
                        />
                        
                        {/* Facecam Crop Selector - Only on Source Video */}
                        {montageStyle === 'split' && !isGeneratedView && videoRef.current && (
                        <CropBoxSelector 
                            videoElement={videoRef.current}
                            onCropChange={setFacecamCrop}
                            initialCrop={facecamCrop}
                            aspectRatio={1080 / 768} // Lock to target facecam slot ratio (approx 1.406)
                        />
                        )}
                    </div>
                    </div>

                    {/* Form Section */}
                    <div className="modal-form" style={{ padding: 0 }}>
                        {/* Error Message */}
                        {error && (
                            <div style={{
                            padding: '12px 16px',
                            backgroundColor: 'rgba(255, 68, 68, 0.1)',
                            border: '1px solid #ff4444',
                            borderRadius: '8px',
                            color: '#ff6666',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '20px'
                            }}>
                            <span>{error}</span>
                            <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#ff6666' }}>×</button>
                            </div>
                        )}

                        {/* Progress Bar */}
                        {isGenerating && (
                            <div className="progress-container">
                            <div className="progress-header">
                                <span>Génération en cours...</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="progress-track">
                                <div className="progress-fill" style={{ width: `${progress}%` }} />
                            </div>
                            </div>
                        )}
                        
                        <div className="input-group">
                            <label className="input-label">Titre</label>
                            <input 
                            type="text" 
                            className="custom-input"
                            value={title} 
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={isGenerating}
                            placeholder="Entrez un titre accrocheur..."
                            />
                        </div>
                        
                        <div className="input-group">
                            <label className="input-label">Description</label>
                            <textarea 
                            className="custom-textarea"
                            value={description} 
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={isGenerating}
                            rows={3}
                            placeholder="Description pour TikTok..."
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Style de Montage</label>
                            <div className="radio-group">
                            <label className={`radio-card ${montageStyle === 'blur' ? 'active' : ''}`}>
                                <input 
                                type="radio" 
                                value="blur" 
                                checked={montageStyle === 'blur'} 
                                onChange={(e) => setMontageStyle(e.target.value as 'blur' | 'split')}
                                disabled={isGenerating}
                                />
                                <span className="radio-label">Fond Flou</span>
                            </label>
                            <label className={`radio-card ${montageStyle === 'split' ? 'active' : ''}`}>
                                <input 
                                type="radio" 
                                value="split" 
                                checked={montageStyle === 'split'} 
                                onChange={(e) => setMontageStyle(e.target.value as 'blur' | 'split')}
                                disabled={isGenerating}
                                />
                                <span className="radio-label">Facecam/Gameplay</span>
                            </label>
                            </div>
                        </div>

                        {/* Trim Inputs */}
                        {!isGeneratedView && (
                            <div className="input-group" style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ flex: 1 }}>
                                    <label className="input-label">Début (s)</label>
                                    <input 
                                        type="number" 
                                        className="custom-input"
                                        value={startTime}
                                        onChange={(e) => {
                                            const val = Math.max(0, parseFloat(e.target.value) || 0);
                                            setStartTime(val);
                                        }}
                                        min={0}
                                        step={0.1}
                                        disabled={isGenerating}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="input-label">Fin (s)</label>
                                    <input 
                                        type="number" 
                                        className="custom-input"
                                        value={endTime}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            setEndTime(val);
                                        }}
                                        min={0}
                                        step={0.1}
                                        disabled={isGenerating}
                                    />
                                    <div style={{ fontSize: '10px', color: '#adadb8', marginTop: '4px', textAlign: 'right' }}>
                                        Durée totale: {duration.toFixed(1)}s
                                    </div>
                                </div>
                            </div>
                        )}

                        {montageStyle === 'split' && !isGeneratedView && (
                            <div style={{
                            padding: '12px',
                            backgroundColor: 'rgba(145, 71, 255, 0.05)',
                            border: '1px solid rgba(145, 71, 255, 0.2)',
                            borderRadius: '8px',
                            fontSize: '13px',
                            color: '#adadb8',
                            marginTop: '10px'
                            }}>
                            💡 <strong>Astuce :</strong> Sélectionnez votre Facecam sur la vidéo ci-dessus.
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="modal-actions">
                            {isGenerating ? (
                            <button onClick={handleCancelGeneration} className="btn-danger">⏹ Annuler</button>
                            ) : (
                            <>
                                <button 
                                onClick={handleGenerateMontage} 
                                disabled={isGenerating || isGeneratedView}
                                className="btn-primary"
                                style={{ opacity: isGeneratedView ? 0.5 : 1 }}
                                >
                                {isGeneratedView ? "✅ Montage Généré" : "✨ Générer Montage IA"}
                                </button>
                                
                                {isGeneratedView && !tiktokConnected ? (
                                    <button onClick={handleConnectTikTok} className="btn-secondary" style={{ borderColor: '#00f2ea', color: '#00f2ea' }}>
                                        🔗 Se connecter à TikTok
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handlePublish} 
                                        className="btn-secondary" 
                                        disabled={!isGeneratedView || publishing}
                                    >
                                        {publishing ? "⏳ Envoi..." : (tiktokConnected ? "🚀 Publier sur TikTok" : "🚀 Publier")}
                                    </button>
                                )}
                            </>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* RIGHT COLUMN: Live Preview */}
            <div style={{ width: '400px', backgroundColor: '#0e0e10', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderLeft: '1px solid #333', overflowY: 'auto' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#fff', fontSize: '1rem' }}>
                    {isGeneratedView ? "Rendu Final" : "Aperçu Vertical (9:16)"}
                </h3>
                
                <MontagePreview 
                    videoUrl={fileUrl} // Use original file for preview simulation
                    generatedVideoUrl={currentVideoUrl} // Use current for final result
                    montageStyle={montageStyle}
                    facecamCrop={facecamCrop}
                    title={title}
                    streamerName={clip.broadcaster_name}
                    titlePos={titlePos}
                    badgePos={badgePos}
                    onTitlePosChange={setTitlePos}
                    onBadgePosChange={setBadgePos}
                    isGenerated={isGeneratedView}
                    sourceResolution={videoResolution} // Pass the resolution
                />
                
                {!isGeneratedView && (
                    <div style={{ marginTop: '20px', textAlign: 'center', color: '#adadb8', fontSize: '0.9rem' }}>
                        <p>👆 Glissez le titre et le badge sur l'aperçu pour les positionner.</p>
                        {montageStyle === 'split' && <p>La zone verte à gauche définit votre Facecam.</p>}
                    </div>
                )}
            </div>

        </div>
      </div>
    </div>
  );
};

