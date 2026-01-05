import json
import sys

def generate_tiktok_subtitles(json_path, output_filter_path):
    """
    Converts Whisper JSON/JSONL to FFmpeg drawtext filter
    that displays 2-3 words at a time in the center, TikTok style.
    
    Handles both single JSON object and JSONL (multiple objects per line).
    """
    # Read file and try to parse as single JSON or JSONL
    data = None
    with open(json_path, 'r', encoding='utf-8') as f:
        content = f.read().strip()
        
    # Try single JSON first
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        # Try JSONL (multiple JSON objects, one per line)
        lines = content.split('\n')
        for line in lines:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                # Find the object with transcription
                if 'transcription' in obj:
                    data = obj
                    break
            except json.JSONDecodeError:
                continue
    
    if not data:
        print("Error: Could not parse JSON file", file=sys.stderr)
        sys.exit(1)
    
    # Extract segments from Whisper JSON
    if 'transcription' not in data:
        print("Error: No transcription found in Whisper JSON", file=sys.stderr)
        sys.exit(1)
    
    segments = data['transcription']
    
    # Process each segment and split into word chunks
    chunks = []
    
    for segment in segments:
        text = segment.get('text', '').strip()
        if not text:
            continue
            
        # Get timing in milliseconds
        start_ms = segment['offsets']['from']
        end_ms = segment['offsets']['to']
        
        # Split text into words
        words = text.split()
        if not words:
            continue
        
        # Calculate duration per word (rough estimation)
        segment_duration_ms = end_ms - start_ms
        ms_per_word = segment_duration_ms / len(words) if len(words) > 0 else 0
        
        # Group words into chunks of 2-3
        i = 0
        while i < len(words):
            chunk_words = words[i:i+3]
            chunk_text = ' '.join(chunk_words)
            
            # Calculate chunk timing
            chunk_start_s = (start_ms + i * ms_per_word) / 1000.0
            chunk_end_s = (start_ms + (i + len(chunk_words)) * ms_per_word) / 1000.0
            
            chunks.append({
                'text': chunk_text,
                'start': chunk_start_s,
                'end': chunk_end_s
            })
            
            i += 3
    
    if not chunks:
        print("Warning: No text chunks created", file=sys.stderr)
        # Create empty filter
        with open(output_filter_path, 'w', encoding='utf-8') as f:
            f.write('')
        return
    
    # Generate FFmpeg drawtext filter commands
    filter_parts = []
    for chunk in chunks:
        text_escaped = chunk['text'].replace("'", "\\'").replace(":", "\\:").replace("\\", "\\\\")
        # drawtext with enable between start and end
        # Centered on screen, large font, white with black outline
        filter_part = f"drawtext=text='{text_escaped}':fontcolor=white:fontsize=60:bordercolor=black:borderw=4:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,{chunk['start']:.3f},{chunk['end']:.3f})'"
        filter_parts.append(filter_part)
    
    # Combine all drawtext filters
    full_filter = ','.join(filter_parts)
    
    # Write to output file
    with open(output_filter_path, 'w', encoding='utf-8') as f:
        f.write(full_filter)
    
    print(f"✅ Generated TikTok-style subtitle filter with {len(chunks)} chunks")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python generate_tiktok_subs.py <whisper.json> <output_filter.txt>")
        sys.exit(1)
    
    generate_tiktok_subtitles(sys.argv[1], sys.argv[2])
