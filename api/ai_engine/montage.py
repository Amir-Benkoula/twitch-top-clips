import sys
from moviepy import *
# MoviePy 2.0 uses 'vfx' for effects
# import moviepy.video.fx.all as vfx  <-- standard way or individual imports
# Actually, 'from moviepy import *' usually imports vfx?
# Let's check documentation pattern: clip.with_effects([vfx.Blur(...)])
# However, importing Blur directly from moviepy.video.fx.Blur is deprecated or moved.
# Safest is to import vfx.

import mediapipe as mp
import cv2
import numpy as np
import argparse

def create_layout(clip_path, output_path, start_time=None, end_time=None):
    print(f"🎬 Processing Layout for: {clip_path}")
    clip = VideoFileClip(clip_path)

    # Trim if requested
    if start_time is not None and end_time is not None:
        print(f"✂️ Trimming clip: {start_time}s to {end_time}s")
        clip = clip.subclipped(float(start_time), float(end_time))
    
    # Target dimensions (Vertical 9:16)
    W, H = 1080, 1920
    
    # Background: Scale to fill height (zoomed), blur
    bg_clip = clip.resized(height=H) 
    bg_clip = bg_clip.cropped(width=W, height=H, x_center=bg_clip.w/2, y_center=bg_clip.h/2)
    
    # Custom Blur function using OpenCV (since MoviePy 2.0 vfx.Blur is missing)
    def blur_frame(frame):
        # Convert to BGR for OpenCV if needed, but MoviePy usually handles RGB
        # OpenCV GaussianBlur accepts (w, h) kernel, must be odd
        return cv2.GaussianBlur(frame, (51, 51), 0)

    # Apply blur via image_transform
    # bg_clip = bg_clip.with_effects([vfx.Blur(size=20)]) # Failed
    bg_clip = bg_clip.image_transform(blur_frame)
    
    # Foreground: Original scaled to 1080 width, centered
    fg_clip = clip.resized(width=W)
    fg_clip = fg_clip.with_position(("center", "center"))
    
    # Composite (explicitly preserve original audio)
    final_layout = CompositeVideoClip([bg_clip, fg_clip])
    final_layout = final_layout.with_audio(clip.audio)
    
    # Export
    print(f"💾 Saving Vertical Layout to {output_path}...")
    final_layout.write_videofile(
        output_path, 
        fps=30, 
        codec='libx264', 
        audio_codec='aac',
        threads=4,
        preset='ultrafast'
    )

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--clip", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--start", type=float, required=False)
    parser.add_argument("--end", type=float, required=False)
    args = parser.parse_args()
    
    create_layout(args.clip, args.output, args.start, args.end)
