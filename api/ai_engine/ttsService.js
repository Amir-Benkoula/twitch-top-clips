const { spawn } = require('child_process');
const path = require('path');

const generateTTS = (text, outputFile) => {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, 'generate_voice.py');
        const venvPythonPath = path.join(__dirname, 'venv', 'bin', 'python3');

        console.log(`🎙️ Generating TTS for: "${text}"`);

        const pythonProcess = spawn(venvPythonPath, [scriptPath, text, outputFile]);

        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            console.log(`[Kokoro]: ${data}`);
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
            console.error(`[Kokoro Error]: ${data}`);
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`TTS generation failed with code ${code}: ${errorOutput}`));
            } else {
                resolve(outputFile);
            }
        });
    });
};

module.exports = { generateTTS };
