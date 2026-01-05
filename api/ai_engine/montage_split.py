import sys
from moviepy import VideoFileClip, CompositeVideoClip
import cv2
import argparse

def create_split_layout(clip_path, output_path, facecam_crop, start_time=None, end_time=None):
    """
    Create facecam/gameplay split layout:
    - Top 40%: Facecam (cropped from specified region)
    - Bottom 60%: Gameplay (rest of the frame or entire frame)
    """
    print(f"🎮 Processing Split Layout for: {clip_path}")
    clip = VideoFileClip(clip_path)

    # Trim if requested
    if start_time is not None and end_time is not None:
        print(f"✂️ Trimming clip: {start_time}s to {end_time}s")
        clip = clip.subclipped(float(start_time), float(end_time))
    
    # Target dimensions (Vertical 9:16)
    W, H = 1080, 1920
    facecam_height = int(H * 0.4)  # 768px
    gameplay_height = int(H * 0.6)  # 1152px
    
    # Extract facecam crop coordinates
    crop_x = facecam_crop.get('x', 0)
    crop_y = facecam_crop.get('y', 0)
    crop_w = facecam_crop.get('width', 640)
    crop_h = facecam_crop.get('height', 360)
    
    print(f"📹 Facecam crop: x={crop_x}, y={crop_y}, w={crop_w}, h={crop_h}")
    
    # Crop facecam region from original
    facecam = clip.cropped(x1=crop_x, y1=crop_y, x2=crop_x + crop_w, y2=crop_y + crop_h)
    
    # Resize facecam to fit top section (maintain aspect ratio, then crop to fit)
    facecam_resized = facecam.resized(height=facecam_height)
    if facecam_resized.w > W:
        # Center crop if too wide
        facecam_resized = facecam_resized.cropped(width=W, height=facecam_height, 
                                                   x_center=facecam_resized.w/2, 
                                                   y_center=facecam_resized.h/2)
    elif facecam_resized.w < W:
        # Add black padding if too narrow
        facecam_resized = facecam_resized.with_position(((W - facecam_resized.w) // 2, 0))
        facecam_resized = CompositeVideoClip([facecam_resized], size=(W, facecam_height))
    
    # For gameplay: use entire original clip (scaled to fit bottom section)
    gameplay = clip.resized(height=gameplay_height)
    if gameplay.w > W:
        gameplay = gameplay.cropped(width=W, height=gameplay_height,
                                    x_center=gameplay.w/2,
                                    y_center=gameplay.h/2)
    elif gameplay.w < W:
        gameplay = gameplay.with_position(((W - gameplay.w) // 2, 0))
        gameplay = CompositeVideoClip([gameplay], size=(W, gameplay_height))
    
    # Stack vertically: facecam on top, gameplay below
    facecam_positioned = facecam_resized.with_position((0, 0))
    gameplay_positioned = gameplay.with_position((0, facecam_height))
    
    final_layout = CompositeVideoClip([facecam_positioned, gameplay_positioned], size=(W, H))
    final_layout = final_layout.with_audio(clip.audio)
    
    # Export
    print(f"💾 Saving Split Layout to {output_path}...")
    final_layout.write_videofile(
        output_path,
        fps=30,
        codec='libx264',
        audio_codec='aac',
        threads=4,
        preset='ultrafast'
    )
    
    print(f"✅ Split layout created: {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--clip", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--crop-x", type=int, default=0)
    parser.add_argument("--crop-y", type=int, default=0)
    parser.add_argument("--crop-width", type=int, default=640)
    parser.add_argument("--crop-height", type=int, default=360)
    parser.add_argument("--start", type=float, required=False)
    parser.add_argument("--end", type=float, required=False)
    args = parser.parse_args()
    
    facecam_crop = {
        'x': args.crop_x,
        'y': args.crop_y,
        'width': args.crop_width,
        'height': args.crop_height
    }
    
    create_split_layout(args.clip, args.output, facecam_crop, args.start, args.end)
