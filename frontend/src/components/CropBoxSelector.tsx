import React, { useState, useRef, useEffect } from 'react';

interface CropBoxProps {
  videoElement: HTMLVideoElement | null;
  onCropChange: (crop: { x: number; y: number; width: number; height: number }) => void;
  initialCrop: { x: number; y: number; width: number; height: number };
  aspectRatio?: number; // Optional enforced aspect ratio (width / height)
}

export const CropBoxSelector: React.FC<CropBoxProps> = ({ videoElement, onCropChange, initialCrop, aspectRatio }) => {
  const [crop, setCrop] = useState(initialCrop);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  // Get video dimensions for scaling accounting for object-fit: contain
  const getVideoScale = () => {
    if (!videoElement || !overlayRef.current) return { scale: 1, offsetX: 0, offsetY: 0 };
    
    const overlayRect = overlayRef.current.getBoundingClientRect();
    const videoWidth = videoElement.videoWidth;
    const videoHeight = videoElement.videoHeight;
    const elWidth = overlayRect.width;
    const elHeight = overlayRect.height;
    
    if (!videoWidth || !videoHeight) return { scale: 1, offsetX: 0, offsetY: 0 };

    const videoRatio = videoWidth / videoHeight;
    const elementRatio = elWidth / elHeight;

    let paintedWidth, paintedHeight, offsetX, offsetY;

    if (elementRatio > videoRatio) {
        // Container is wider than video -> Pillarboxed (black bars on sides)
        paintedHeight = elHeight;
        paintedWidth = paintedHeight * videoRatio;
        offsetX = (elWidth - paintedWidth) / 2;
        offsetY = 0;
    } else {
        // Container is taller than video -> Letterboxed (black bars on top/bottom)
        paintedWidth = elWidth;
        paintedHeight = paintedWidth / videoRatio;
        offsetX = 0;
        offsetY = (elHeight - paintedHeight) / 2;
    }
    
    // Scale factor (conversion from Intrinsic to Painted)
    const scale = paintedWidth / videoWidth;
    
    return { scale, offsetX, offsetY };
  };

  const handleMouseDown = (e: React.MouseEvent, type: 'drag' | 'resize') => {
    e.preventDefault();
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const { scale, offsetX, offsetY } = getVideoScale();
    
    // Mouse relative to overlay
    const overlayMouseX = e.clientX - rect.left;
    const overlayMouseY = e.clientY - rect.top;
    
    // Convert to Video Intrinsic Coordinates
    const mouseX = (overlayMouseX - offsetX) / scale;
    const mouseY = (overlayMouseY - offsetY) / scale;

    setDragStart({ x: mouseX - crop.x, y: mouseY - crop.y });
    
    if (type === 'drag') {
      setIsDragging(true);
    } else {
      setIsResizing(true);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging && !isResizing) return;
    if (!overlayRef.current || !videoElement) return;

    const rect = overlayRef.current.getBoundingClientRect();
    const { scale, offsetX, offsetY } = getVideoScale();
    
    const overlayMouseX = e.clientX - rect.left;
    const overlayMouseY = e.clientY - rect.top;
    
    const mouseX = (overlayMouseX - offsetX) / scale;
    const mouseY = (overlayMouseY - offsetY) / scale;

    if (isDragging) {
      const newX = Math.max(0, Math.min(videoElement.videoWidth - crop.width, mouseX - dragStart.x));
      const newY = Math.max(0, Math.min(videoElement.videoHeight - crop.height, mouseY - dragStart.y));
      const newCrop = { ...crop, x: Math.round(newX), y: Math.round(newY) };
      setCrop(newCrop);
      onCropChange(newCrop);
    } else if (isResizing) {
      let newWidth = Math.max(100, Math.min(videoElement.videoWidth - crop.x, mouseX - crop.x));
      let newHeight = Math.max(100, Math.min(videoElement.videoHeight - crop.y, mouseY - crop.y));
      
      // Enforce aspect ratio if provided
      if (aspectRatio) {
        // Calculate height based on width and ratio
        const constrainedHeight = newWidth / aspectRatio;
        
        // If calculated height exceeds video bounds, scale width down instead
        if (crop.y + constrainedHeight > videoElement.videoHeight) {
           newHeight = videoElement.videoHeight - crop.y;
           newWidth = newHeight * aspectRatio;
        } else {
           newHeight = constrainedHeight;
        }
      }

      const newCrop = { ...crop, width: Math.round(newWidth), height: Math.round(newHeight) };
      setCrop(newCrop);
      onCropChange(newCrop);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, crop, dragStart]);

  const { scale, offsetX, offsetY } = getVideoScale();

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'all',
        zIndex: 10
      }}
    >
      {/* Crop box */}
      <div
        style={{
          position: 'absolute',
          left: `${crop.x * scale + offsetX}px`,
          top: `${crop.y * scale + offsetY}px`,
          width: `${crop.width * scale}px`,
          height: `${crop.height * scale}px`,
          border: '3px solid #00ff00',
          cursor: 'move',
          boxSizing: 'border-box'
        }}
        onMouseDown={(e) => handleMouseDown(e, 'drag')}
      >
        {/* Resize handle */}
        <div
          style={{
            position: 'absolute',
            right: '-6px',
            bottom: '-6px',
            width: '12px',
            height: '12px',
            backgroundColor: '#00ff00',
            cursor: 'se-resize',
            borderRadius: '50%'
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            handleMouseDown(e, 'resize');
          }}
        />
        {/* Label */}
        <div
          style={{
            position: 'absolute',
            top: '-25px',
            left: '0',
            backgroundColor: '#00ff00',
            color: '#000',
            padding: '2px 8px',
            fontSize: '12px',
            fontWeight: 'bold',
            borderRadius: '3px',
            whiteSpace: 'nowrap'
          }}
        >
          Facecam: {crop.width}×{crop.height}
        </div>
      </div>
    </div>
  );
};
