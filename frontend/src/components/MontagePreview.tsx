import { useRef } from 'react';
import { DraggableOverlay } from './DraggableOverlay';

interface MontagePreviewProps {
  videoUrl: string;
  montageStyle: 'blur' | 'split';
  facecamCrop: { x: number, y: number, width: number, height: number };
  title: string;
  streamerName: string;
  titlePos: { x: number, y: number };
  badgePos: { x: number, y: number };
  onTitlePosChange: (pos: { x: number, y: number }) => void;
  onBadgePosChange: (pos: { x: number, y: number }) => void;
  isGenerated: boolean;
  generatedVideoUrl?: string;
  videoRef?: React.RefObject<HTMLVideoElement>; // Ref to the source video for syncing/capturing
  sourceResolution?: { width: number, height: number }; // Optional with default
}

export const MontagePreview = ({
  videoUrl,
  montageStyle,
  facecamCrop,
  title,
  streamerName,
  titlePos,
  badgePos,
  onTitlePosChange,
  onBadgePosChange,
  isGenerated,
  generatedVideoUrl,
  sourceResolution = { width: 1920, height: 1080 } // Default fallback
}: MontagePreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // If generated, show the final video
  if (isGenerated && generatedVideoUrl) {
    return (
      <div className="preview-container" style={{ aspectRatio: '9/16', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden' }}>
        <video 
          src={generatedVideoUrl} 
          controls 
          style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
        />
      </div>
    );
  }

  // Calculate transform for Split Facecam preview
  const getFacecamStyle = () => {
    // Default/Safety
    if (!facecamCrop.width || !facecamCrop.height) return {};

    // Use REAL resolution to calculate percentages
    const VIDEO_W = sourceResolution.width;
    const VIDEO_H = sourceResolution.height;

    // Logic:
    // 1. Scale video so that the Crop Width equals the Container Width.
    //    width = (OriginalW / CropW) * 100% (of container)
    // 2. Translate video so that Crop positions (x,y) move to (0,0).
    //    We use % based logic relative to the source video dimensions.

    return {
        position: 'absolute' as const,
        maxWidth: 'none',
        // Scale width: The video element becomes huge enough that 'CropWidth' amount of it fills 100% of container.
        width: `${(VIDEO_W / facecamCrop.width) * 100}%`, 
        height: 'auto', // Preserve intrinsic aspect ratio of the source
        
        // Reset position anchors
        top: 0,
        left: 0,
        
        // Move the video contents
        // Translate % is relative to the element size (which is now scaled).
        // BUT wait, transform: translate(-50%) moves by 50% of the CURRENT element width.
        // We want to move by X pixels.
        // What is X pixels in terms of total width?
        // X_pct = (x / VIDEO_W) * 100.
        // Since the element width represents VIDEO_W, moving by X_pct should correspond to moving by x pixels.
        transform: `translate3d(-${(facecamCrop.x / VIDEO_W) * 100}%, -${(facecamCrop.y / VIDEO_H) * 100}%, 0)`,
        transformOrigin: 'top left',
        
        transition: 'width 0.1s ease-out, transform 0.1s ease-out',
        willChange: 'transform, width'
    };
  };

  return (
    <div 
      ref={containerRef}
      className="preview-container" 
      style={{ 
        aspectRatio: '9/16', 
        width: '100%',
        backgroundColor: '#18181b', 
        borderRadius: '12px', 
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}
    >
      {/* Background Layer (Videos) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, backgroundColor: '#000' }}>
        {montageStyle === 'blur' ? (
           // Blur Style
           <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
             {/* BG */}
             <video 
               src={videoUrl} 
               style={{ 
                 position: 'absolute',
                 width: '100%', 
                 height: '100%', 
                 objectFit: 'cover', 
                 filter: 'blur(15px) brightness(0.6)',
                 transform: 'scale(1.2)' 
               }} 
               muted loop autoPlay playsInline
             />
             {/* FG */}
             <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <video 
                  src={videoUrl} 
                  style={{ width: '100%', height: 'auto', maxHeight: '100%' }} 
                  muted loop autoPlay playsInline
                />
             </div>
           </div>
        ) : (
          // Split Style
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Top Facecam - Fixed Aspect Ratio matching CropBox (1080/768) */}
            <div style={{ 
                width: '100%', 
                aspectRatio: `${1080/768}`, // Exact match to crop constraint
                position: 'relative', 
                overflow: 'hidden', 
                borderBottom: '2px solid #9147ff', 
                backgroundColor: '#000',
                flex: 'none' // Don't let flexbox squash it
            }}>
               <video 
                  src={videoUrl}
                  style={getFacecamStyle()}
                  muted loop autoPlay playsInline
               />
               <div style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.6)', padding: '2px 5px', fontSize: '10px', borderRadius: '4px', pointerEvents: 'none', color: '#fff' }}>
                  Facecam
               </div>
            </div>
            {/* Bottom Gameplay - Fills remaining space */}
            <div style={{ flex: '1', position: 'relative', overflow: 'hidden', backgroundColor: '#000' }}>
               <video 
                 src={videoUrl}
                 style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                 muted loop autoPlay playsInline
               />
            </div>
          </div>
        )}
      </div>

      {/* Overlays Layer (Z-Index 20) */}
      {!isGenerated && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }}>
            {/* Draggable Title */}
            <div style={{ pointerEvents: 'auto' }}> {/* Wrapper to re-enable pointer events */}
                <DraggableOverlay
                    initialPosition={titlePos}
                    onPositionChange={onTitlePosChange}
                    containerRef={containerRef}
                    visible={true}
                >
                    <div style={{
                        padding: '10px 20px',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '18px',
                        textAlign: 'center',
                        textShadow: '2px 2px 4px black',
                        border: '2px dashed rgba(255, 255, 255, 0.7)',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        borderRadius: '8px',
                        cursor: 'grab',
                        minWidth: '100px'
                    }}>
                        {title || "TITRE"}
                    </div>
                </DraggableOverlay>
            </div>

            {/* Draggable Badge */}
            <div style={{ pointerEvents: 'auto' }}>
                <DraggableOverlay
                    initialPosition={badgePos}
                    onPositionChange={onBadgePosChange}
                    containerRef={containerRef}
                    visible={true}
                >
                    <div style={{
                        padding: '6px 12px',
                        backgroundColor: '#FF6B6B',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        borderRadius: '20px',
                        border: '2px dashed rgba(255, 255, 255, 0.7)',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.5)',
                        cursor: 'grab'
                    }}>
                        TTV @{streamerName}
                    </div>
                </DraggableOverlay>
            </div>
            
            {/* Helpful Guide Overlay */}
             <div style={{
                position: 'absolute',
                bottom: '10px',
                width: '100%',
                textAlign: 'center',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '10px',
                pointerEvents: 'none'
            }}>
                Zone de Prévisualisation Verticale (9:16)
            </div>
        </div>
      )}
    </div>
  );
};
