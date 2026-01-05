import sys
import kokoro
import soundfile as sf
import numpy as np
import os

def generate_voice(text, output_file):
    try:
        # Initialize pipeline for French (lang_code='f')
        # This will download the model automatically if needed on first run
        # voice='fm' is a good French male voice, 'af' is American Female. 
        # Using 'ff_siwis' or similar strictly French voice if available, 
        # but Kokoro's default 'f' language pack usually includes appropriate voices.
        # Let's try to infer or use a default.
        
        # Initialize pipeline
        # lang_code 'f' = French
        pipeline = kokoro.KPipeline(lang_code='f') 
        
        # Generate audio
        # voice='fm' (French Male) or 'ff' (French Female) - need to check exact available codes
        # Kokoro v0.19 typically supports 'ff_siwis' for French.
        generator = pipeline(text, voice='ff_siwis', speed=1)
        
        # Collect all audio segments
        all_audio = []
        for i, (gs, ps, audio) in enumerate(generator):
            all_audio.append(audio)
            
        if not all_audio:
            print("Error: No audio generated")
            sys.exit(1)
            
        # Concatenate all segments
        final_audio = np.concatenate(all_audio)
        
        # Save to file (Kokoro usually outputs 24khz)
        sf.write(output_file, final_audio, 24000)
        print(f"Success: {output_file}")
        
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python generate_voice.py <text> <output_file>")
        sys.exit(1)
        
    text_input = sys.argv[1]
    output_path = sys.argv[2]
    
    generate_voice(text_input, output_path)
