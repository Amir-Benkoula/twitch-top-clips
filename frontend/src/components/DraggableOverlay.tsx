import { useState, useRef, useEffect, type RefObject } from 'react';

interface DraggableOverlayProps {
  initialPosition: { x: number; y: number };
  onPositionChange: (pos: { x: number; y: number }) => void;
  containerRef: RefObject<HTMLElement | null>;
  children: React.ReactNode;
  visible: boolean;
}

export const DraggableOverlay = ({ initialPosition, onPositionChange, containerRef, children, visible }: DraggableOverlayProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(initialPosition);
  const elementRef = useRef<HTMLDivElement>(null);
  
  // Update internal position when prop changes (unless dragging)
  useEffect(() => {
    if (!isDragging) {
      setPosition(initialPosition);
    }
  }, [initialPosition, isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current || !elementRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const elementRect = elementRef.current.getBoundingClientRect();
      
      let newX = e.clientX - containerRect.left - (elementRect.width / 2);
      let newY = e.clientY - containerRect.top - (elementRect.height / 2);

      // Convert to percentage
      const percentX = Math.max(0, Math.min(1, newX / containerRect.width));
      const percentY = Math.max(0, Math.min(1, newY / containerRect.height));

      setPosition({ x: percentX, y: percentY });
      onPositionChange({ x: percentX, y: percentY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, containerRef, onPositionChange]);

  if (!visible) return null;

  return (
    <div
      ref={elementRef}
      style={{
        position: 'absolute',
        left: `${position.x * 100}%`,
        top: `${position.y * 100}%`,
        transform: 'translate(-50%, -50%)',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        zIndex: 20,
        touchAction: 'none' // Prevent scrolling while dragging (mobile)
      }}
      onMouseDown={handleMouseDown}
    >
      {children}
    </div>
  );
};
