const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const generateSubtitles = (audioInputPath, outputSrtPath) => {
    return new Promise((resolve, reject) => {
        // Path to the compiled 'whisper-cli' binary (formerly 'main')
        // Using CMake build path: build/bin/whisper-cli
        const whisperBinary = path.join(__dirname, 'whisper.cpp', 'build', 'bin', 'whisper-cli');
        const modelPath = path.join(__dirname, 'whisper.cpp', 'models', 'ggml-large-v3-turbo-q5_0.bin');

        if (!fs.existsSync(whisperBinary)) {
            return reject(new Error(`Whisper binary not found at ${whisperBinary}`));
        }
        if (!fs.existsSync(modelPath)) {
            return reject(new Error(`Whisper model not found at ${modelPath}`));
        }

        // Output path without extension (whisper adds .srt automatically if -osrt is used)
        const outputBase = outputSrtPath.replace('.srt', '');

        console.log(`📝 Generating Word-level Subtitles for: ${audioInputPath}`);

        // Output JSON with word timestamps instead of SRT
        const outputJson = outputSrtPath.replace('.srt', '.json');

        // Command: whisper-cli with JSON output and word-level timestamps
        const args = [
            '-m', modelPath,
            '-f', audioInputPath,
            '-oj', // Output JSON format with word timestamps
            '-of', outputBase, // Output filename (without extension)
            '-l', 'fr' // Force French language
        ];

        const whisperProcess = spawn(whisperBinary, args);

        let errorOutput = '';

        whisperProcess.stdout.on('data', (data) => {
            // Whisper prints transcription to stdout, useful for debugging but noisy
            // console.log(`[Whisper]: ${data}`);
        });

        whisperProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
            // console.error(`[Whisper Log]: ${data}`);
        });

        whisperProcess.on('close', (code) => {
            // Verify file creation - Whisper outputs .json
            const expectedFile = `${outputBase}.json`;
            if (code !== 0 || !fs.existsSync(expectedFile)) {
                reject(new Error(`Whisper STT failed with code ${code}. Output: ${expectedFile}. Err: ${errorOutput}`));
            } else {
                console.log(`✅ Word-level transcription generated: ${expectedFile}`);
                resolve(expectedFile);
            }
        });
    });
};

module.exports = { generateSubtitles };
