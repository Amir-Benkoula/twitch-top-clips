const express = require('express');
const { getTopGamesAndClips, getTopStreamersAndClips } = require('./twitchClient');
const { downloadClip } = require('./downloadController');
const { generateMontage } = require('./montageController');
const path = require('path');
const fs = require('fs');
const tiktokClient = require('./tiktokClient');
require('dotenv').config();

const app = express();
const cors = require('cors');
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json()); // Enable JSON body parsing
app.use('/downloads', express.static(path.join(__dirname, '..', 'downloads')));

app.post('/api/download', downloadClip);
app.post('/api/generate-montage', generateMontage);

app.get('/api/top-streams', async (req, res) => {
    try {
        const data = await getTopGamesAndClips();
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            data: data
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch top streams and clips',
            details: error.message
        });
    }
});
app.get('/api/top-streamers', async (req, res) => {
    try {
        const data = await getTopStreamersAndClips();
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            data: data
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch top streamers and clips',
            details: error.message
        });
    }
});
app.get('/api/generated-clips', (req, res) => {
    const downloadsDir = path.join(__dirname, '..', 'downloads');

    fs.readdir(downloadsDir, (err, files) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, error: 'Failed to scan downloads directory' });
        }

        const generatedClips = files
            .filter(file => file && file.endsWith('_montage.mp4'))
            .map(file => {
                const filePath = path.join(downloadsDir, file);
                try {
                    const stats = fs.statSync(filePath);
                    return {
                        filename: file,
                        url: `http://localhost:3000/downloads/${file}`,
                        createdAt: stats.birthtime
                    };
                } catch (e) {
                    return null;
                }
            })
            .filter(item => item !== null)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({ success: true, data: generatedClips });
    });
});

app.delete('/api/generated-clips/:filename', (req, res) => {
    const filename = req.params.filename;
    const downloadsDir = path.join(__dirname, '..', 'downloads');
    const filePath = path.join(downloadsDir, filename);

    // Security check to prevent directory traversal
    if (!filename.endsWith('_montage.mp4') || filename.includes('/') || filename.includes('..')) {
        return res.status(400).json({ success: false, error: 'Invalid filename' });
    }

    if (fs.existsSync(filePath)) {
        try {
            // 1. Delete the montage file
            fs.unlinkSync(filePath);

            // 2. Try to delete the source file (e.g. "123_montage.mp4" -> "123.mp4")
            const clipId = filename.replace('_montage.mp4', '');
            const sourcePath = path.join(downloadsDir, `${clipId}.mp4`);

            if (fs.existsSync(sourcePath)) {
                fs.unlinkSync(sourcePath);
            }

            res.json({ success: true, message: 'Clip deleted successfully' });
        } catch (err) {
            console.error('Error deleting file:', err);
            res.status(500).json({ success: false, error: 'Failed to delete file' });
        }
    } else {
        res.status(404).json({ success: false, error: 'File not found' });
    }
});

// --- TikTok API Routes ---

app.get('/api/auth/tiktok', (req, res) => {
    const url = tiktokClient.getAuthUrl();
    res.json({ url });
});

app.get('/auth/tiktok/callback', async (req, res) => {
    const { code, state } = req.query;
    if (code) {
        const result = await tiktokClient.getAccessToken(code);
        if (result.success) {
            // Redirect to frontend (assumed localhost:5173 or current origin)
            // You might want to pass a success param
            res.redirect('http://localhost:5173/?tiktok_auth=success');
        } else {
            res.redirect(`http://localhost:5173/?tiktok_auth=error&msg=${encodeURIComponent(JSON.stringify(result.error))}`);
        }
    } else {
        res.status(400).send('No code provided');
    }
});

app.get('/api/auth/tiktok/status', (req, res) => {
    res.json({ isAuthenticated: tiktokClient.isAuthenticated() });
});

app.post('/api/upload/tiktok', async (req, res) => {
    const { filePath, title } = req.body;

    if (!filePath || !title) {
        return res.status(400).json({ error: 'Missing filePath or title' });
    }

    // Security check: ensure file is in downloads folder
    if (!filePath.includes('/downloads/') && !filePath.includes('\\downloads\\')) {
        return res.status(403).json({ error: 'Invalid file path' });
    }

    try {
        // Resolve absolute path if sent relative
        let absPath = filePath;
        if (!path.isAbsolute(filePath)) {
            // If client sent relative path or url, try to resolve it map to local system
            // This depends on what frontend sends. 
            // Frontend sends: http://localhost:3000/downloads/xyz.mp4
            // We need: /Users/.../api/downloads/xyz.mp4
            const filename = path.basename(filePath);
            absPath = path.join(__dirname, '..', 'downloads', filename);
        }

        if (!fs.existsSync(absPath)) {
            return res.status(404).json({ error: 'Video file not found on server' });
        }

        const result = await tiktokClient.uploadVideo(absPath, title);
        res.json(result);
    } catch (error) {
        console.error('Upload Endpoint Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Test endpoint: http://localhost:${PORT}/api/top-streams`);
});
