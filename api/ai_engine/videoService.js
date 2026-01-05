const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const runFFmpeg = (args) => {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', args);
        let stderr = '';
        ffmpeg.stderr.on('data', d => stderr += d.toString());
        ffmpeg.on('close', code => {
            if (code !== 0) {
                console.error('FFmpeg Error:', stderr);
                reject(new Error(`FFmpeg exited with code ${code}`));
            } else resolve();
        });
    });
};

const processBlurStyle = async (inputVideo, outputPath, title, streamerName, titlePos, badgePos, startTime, endTime) => {
    // 1. Python: Create Vertical Layout (Background + Foreground)
    console.log('🐍 1. Creating Blur Layout (Python/MoviePy)...');
    const layoutClip = inputVideo.replace('.mp4', '_layout.mp4');
    const venvPython = path.join(__dirname, 'venv', 'bin', 'python3');
    const montageScript = path.join(__dirname, 'montage.py');

    const layoutArgs = [montageScript, '--clip', inputVideo, '--output', layoutClip];
    if (startTime !== undefined && endTime !== undefined) {
        layoutArgs.push('--start', startTime, '--end', endTime);
    }

    await new Promise((resolve, reject) => {
        const py = spawn(venvPython, layoutArgs);
        py.stdout.on('data', d => console.log(`[Py]: ${d}`));
        py.stderr.on('data', d => console.error(`[Py Err]: ${d}`));
        py.on('close', code => code === 0 ? resolve() : reject(new Error(`Python failed ${code}`)));
    });

    // 2. Python: Generate Streamer Text Overlay (PIL)
    console.log('🎨 2. Generating Streamer + Title Overlay (PIL)...');
    const overlayScript = path.join(__dirname, 'generate_text_overlay.py');
    const overlayPng = inputVideo.replace('.mp4', '_streamer_overlay.png');

    const overlayArgs = [overlayScript, streamerName, overlayPng];

    // Add title argument
    if (title) {
        overlayArgs.push('--title', title);

        let tx = 540; // Default center X (1080/2)
        let ty = 350; // Default Y

        if (titlePos) {
            tx = Math.round(titlePos.x * 1080);
            ty = Math.round(titlePos.y * 1920);
            overlayArgs.push('--title_x', tx.toString(), '--title_y', ty.toString());
        }
    }

    // Add custom badge position if provided
    if (badgePos) {
        const x = Math.round(badgePos.x * 1080);
        const y = Math.round(badgePos.y * 1920);
        overlayArgs.push('--x', x.toString(), '--y', y.toString());
    }

    await new Promise((resolve, reject) => {
        const py = spawn(venvPython, overlayArgs);
        py.stdout.on('data', d => console.log(`[PIL]: ${d}`));
        py.stderr.on('data', d => console.error(`[PIL Err]: ${d}`));
        py.on('close', code => code === 0 ? resolve() : reject(new Error(`PIL overlay failed ${code}`)));
    });

    // 3. FFmpeg: Composite Streamer Overlay (Title already inside PNG)
    console.log('✍️ 3. Compositing Overlay...');

    // Filter: Just overlay the PNG (0:0)
    const filterComplex = `[0:v][1:v]overlay=0:0[v]`;

    await runFFmpeg([
        '-y',
        '-i', layoutClip,
        '-i', overlayPng,  // Second input: PNG overlay (contains badge + title)
        '-filter_complex', filterComplex,
        '-map', '[v]',
        '-map', '0:a',
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-b:a', '192k',
        outputPath
    ]);

    // Cleanup
    // fs.unlinkSync(layoutClip);
    // fs.unlinkSync(overlayPng);

    return outputPath;
};

const processSplitStyle = async (inputVideo, outputPath, title, streamerName, facecamCrop, titlePos, badgePos, startTime, endTime) => {
    // 1. Python: Create Split Layout (Facecam top, Gameplay bottom)
    console.log('🎮 1. Creating Split Layout (Python/MoviePy)...');
    const layoutClip = inputVideo.replace('.mp4', '_split_layout.mp4');
    const venvPython = path.join(__dirname, 'venv', 'bin', 'python3');
    const splitScript = path.join(__dirname, 'montage_split.py');

    const args = [
        splitScript,
        '--clip', inputVideo,
        '--output', layoutClip,
        '--crop-x', facecamCrop.x.toString(),
        '--crop-y', facecamCrop.y.toString(),
        '--crop-width', facecamCrop.width.toString(),
        '--crop-height', facecamCrop.height.toString()
    ];

    if (startTime !== undefined && endTime !== undefined) {
        args.push('--start', startTime, '--end', endTime);
    }

    await new Promise((resolve, reject) => {
        const py = spawn(venvPython, args);
        py.stdout.on('data', d => console.log(`[Py]: ${d}`));
        py.stderr.on('data', d => console.error(`[Py Err]: ${d}`));
        py.on('close', code => code === 0 ? resolve() : reject(new Error(`Python split failed ${code}`)));
    });

    // 2. Python: Generate Streamer Text Overlay (PIL)
    console.log('🎨 2. Generating Streamer + Title Overlay (PIL)...');
    const overlayScript = path.join(__dirname, 'generate_text_overlay.py');
    const overlayPng = inputVideo.replace('.mp4', '_streamer_overlay.png');

    const overlayArgs = [overlayScript, streamerName, overlayPng];

    // Add title argument
    if (title) {
        overlayArgs.push('--title', title);

        let tx = 540; // Default center X (1080/2)
        let ty = 350; // Default Y

        if (titlePos) {
            tx = Math.round(titlePos.x * 1080);
            ty = Math.round(titlePos.y * 1920);
            overlayArgs.push('--title_x', tx.toString(), '--title_y', ty.toString());
        }
    }

    // Add custom badge position if provided
    if (badgePos) {
        const x = Math.round(badgePos.x * 1080);
        const y = Math.round(badgePos.y * 1920);
        overlayArgs.push('--x', x.toString(), '--y', y.toString());
    }

    await new Promise((resolve, reject) => {
        const py = spawn(venvPython, overlayArgs);
        py.stdout.on('data', d => console.log(`[PIL]: ${d}`));
        py.stderr.on('data', d => console.error(`[PIL Err]: ${d}`));
        py.on('close', code => code === 0 ? resolve() : reject(new Error(`PIL overlay failed ${code}`)));
    });

    // 3. FFmpeg: Composite Streamer Overlay (Title already inside PNG)
    console.log('✍️ 3. Compositing Overlay...');

    // Filter: Just overlay the PNG (0:0)
    const filterComplex = `[0:v][1:v]overlay=0:0[v]`;

    await runFFmpeg([
        '-y',
        '-i', layoutClip,
        '-i', overlayPng,
        '-filter_complex', filterComplex,
        '-map', '[v]',
        '-map', '0:a',
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-b:a', '192k',
        outputPath
    ]);

    // Cleanup
    // fs.unlinkSync(layoutClip);
    // fs.unlinkSync(overlayPng);

    return outputPath;
};

module.exports = { processBlurStyle, processSplitStyle };
