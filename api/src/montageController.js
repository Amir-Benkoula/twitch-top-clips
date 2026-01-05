const path = require('path');
const fs = require('fs');
const { processBlurStyle, processSplitStyle } = require('../ai_engine/videoService');

const generateMontage = async (req, res) => {
    const { clipId, title, clipPath, streamerName, montageStyle, facecamCrop, titlePos, badgePos, startTime, endTime } = req.body;

    if (!clipId || !title || !streamerName) {
        return res.status(400).json({ success: false, error: 'Missing parameters (clipId, title, or streamerName)' });
    }

    // Default to blur style if not specified
    const style = montageStyle || 'blur';

    // Validate facecam crop if split style
    if (style === 'split' && !facecamCrop) {
        return res.status(400).json({ success: false, error: 'Facecam crop required for split style' });
    }

    const fileName = clipId + '.mp4';
    const inputVideoPath = path.join(__dirname, '..', 'downloads', fileName);

    if (!fs.existsSync(inputVideoPath)) {
        return res.status(404).json({ success: false, error: 'Original video file not found on server' });
    }

    const workDir = path.join(__dirname, '..', 'downloads');
    const finalOutputPath = path.join(workDir, `${clipId}_montage.mp4`);
    const publicUrl = `http://localhost:3000/downloads/${clipId}_montage.mp4`;

    try {
        console.log(`🚀 Starting Montage Generation for ${clipId} (Style: ${style})...`);

        // Route to appropriate processing function based on style
        if (style === 'split') {
            await processSplitStyle(inputVideoPath, finalOutputPath, title, streamerName, facecamCrop, titlePos, badgePos, startTime, endTime);
        } else {
            await processBlurStyle(inputVideoPath, finalOutputPath, title, streamerName, titlePos, badgePos, startTime, endTime);
        }

        console.log('✨ Montage generated successfully!');

        res.json({ success: true, montage_url: publicUrl });

    } catch (error) {
        console.error('Montage generation failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = { generateMontage };
