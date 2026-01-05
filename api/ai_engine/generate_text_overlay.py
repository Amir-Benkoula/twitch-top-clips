import sys
from PIL import Image, ImageDraw, ImageFont
try:
    from pilmoji import Pilmoji
except ImportError:
    print("Warning: pilmoji not found, emojis might not render correctly")
    Pilmoji = None
import random
import argparse

def generate_streamer_overlay(streamer_name, output_path, center_x=None, center_y=1470, title=None, title_x=None, title_y=None, width=1080, height=1920):
    """
    Generate a PNG overlay with streamer name on colored background.
    Positioned at custom coordinates (default: bottom of vertical video).
    """
    # Create transparent image
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Random vibrant background color
    colors = [
        (255, 107, 107, 255),  # #FF6B6B - Coral Red
        (78, 205, 196, 255),   # #4ECDC4 - Turquoise
        (69, 183, 209, 255),   # #45B7D1 - Sky Blue
        (255, 160, 122, 255),  # #FFA07A - Salmon
        (152, 216, 200, 255),  # #98D8C8 - Mint
        (247, 220, 111, 255),  # #F7DC6F - Yellow
        (187, 143, 206, 255),  # #BB8FCE - Purple
        (133, 193, 226, 255)   # #85C1E2 - Light Blue
    ]
    bg_color = random.choice(colors)
    
    
    # Text setup (calculate size first to determine badge width)
    text = f"TTV @{streamer_name}"
    
    # Try to use a nice font, fallback to default
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 60)
    except:
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 60)
        except:
            font = ImageFont.load_default()
    
    # Calculate text dimensions
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # Badge dimensions (rounded rectangle with padding)
    padding_x = 40  # Horizontal padding around text
    padding_y = 20  # Vertical padding
    badge_width = text_width + (padding_x * 2)
    badge_height = text_height + (padding_y * 2)
    
    # Calculate Position
    if center_x is None:
        badge_x = (width - badge_width) // 2  # Center horizontally
    else:
        badge_x = int(center_x - (badge_width / 2))
        
    badge_y = int(center_y - (badge_height / 2))
    
    corner_radius = 25  # Rounded corners
    
    # Draw rounded rectangle (badge)
    draw.rounded_rectangle(
        [(badge_x, badge_y), (badge_x + badge_width, badge_y + badge_height)],
        radius=corner_radius,
        fill=bg_color
    )
    
    # Calculate text position (centered in badge)
    text_x = badge_x + padding_x
    text_y = badge_y + padding_y - 5  # Slight visual adjustment
    
    # Draw text with black outline (stroke)
    draw.text((text_x, text_y), text, font=font, fill=(255, 255, 255, 255), stroke_width=4, stroke_fill=(0, 0, 0, 255))
    
    # --- DRAW TITLE IF PROVIDED ---
    if title:
        try:
            # Use Helvetica Bold for Title
            title_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 70, index=1)
        except:
             title_font = font # Fallback to same as badge

        # Measure Title
        # Note: standard textbbox might be slightly off for emojis, but usually acceptable for centering
        title_bbox = draw.textbbox((0, 0), title, font=title_font)
        title_w = title_bbox[2] - title_bbox[0]
        title_h = title_bbox[3] - title_bbox[1]
        
        # Determine Position
        t_x = (width - title_w) // 2
        t_y = 350 # Default
        
        if title_x is not None:
             t_x = int(title_x - (title_w / 2))
        if title_y is not None:
             t_y = int(title_y - (title_h / 2))
             
        # Use Pilmoji for rendering the title to support Emojis
        if Pilmoji:
            with Pilmoji(img) as pilmoji:
                # Shadow
                shadow_offset = 4
                pilmoji.text((t_x + shadow_offset, t_y + shadow_offset), title, font=title_font, fill='black')
                
                # Main Text (Strangely Pilmoji stroke support depends on version, let's play safe)
                # Pilmoji wraps PIL's text, so kwargs should propagate
                pilmoji.text((t_x, t_y), title, font=title_font, fill='white', stroke_width=2, stroke_fill='black')
        else:
             # Fallback to standard PIL
             shadow_offset = 4
             draw.text((t_x + shadow_offset, t_y + shadow_offset), title, font=title_font, fill='black')
             draw.text((t_x, t_y), title, font=title_font, fill='white', stroke_width=2, stroke_fill='black')


    # Save PNG with transparency
    img.save(output_path, 'PNG')
    print(f"✅ Generated overlay with title: {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("streamer_name")
    parser.add_argument("output_path")
    # Badge pos
    parser.add_argument("--x", type=float, help="Badge Center X")
    parser.add_argument("--y", type=float, help="Badge Center Y", default=1470)
    # Title args
    parser.add_argument("--title", type=str, help="Video Title")
    parser.add_argument("--title_x", type=float, help="Title Center X")
    parser.add_argument("--title_y", type=float, help="Title Center Y")
    
    args = parser.parse_args()
    
    generate_streamer_overlay(
        args.streamer_name, 
        args.output_path, 
        args.x, 
        args.y,
        title=args.title,
        title_x=args.title_x,
        title_y=args.title_y
    )
