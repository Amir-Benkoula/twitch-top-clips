const axios = require('axios');
const fs = require('fs');
const path = require('path');

const downloadClip = async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, error: 'Missing clip ID' });
    }

    const filePath = path.join(__dirname, '..', 'downloads', `${id}.mp4`);
    const publicUrl = `http://localhost:3000/downloads/${id}.mp4`;

    // Check if file already exists
    if (fs.existsSync(filePath)) {
        // Optional: Check file size to ensure it's not a corrupt stub
        const stats = fs.statSync(filePath);
        if (stats.size > 100000) { // > 100KB
            return res.json({ success: true, file_url: publicUrl, cached: true });
        }
    }

    try {
        // 1. Fetch Clip Playback details via GQL
        // This 'Client-ID' is the public one used by Twitch Web
        const gqlResponse = await axios.post('https://gql.twitch.tv/gql',
            [
                {
                    operationName: "VideoAccessToken_Clip",
                    variables: { slug: id },
                    extensions: {
                        persistedQuery: {
                            version: 1,
                            sha256Hash: "36b89d2507fce29e5ca551df756d27c1cfe079e2609642b4390aa4c35796eb11"
                        }
                    }
                }
            ],
            {
                headers: {
                    'Client-ID': 'kimne78kx3ncx6brgo4mv6wki5h1ko'
                }
            }
        );

        const clipData = gqlResponse.data[0].data.clip;

        if (!clipData) {
            throw new Error('Clip not found in GQL response');
        }

        const sourceQuality = clipData.videoQualities.find(q => q.quality === 'source') || clipData.videoQualities[0];

        if (!sourceQuality || !sourceQuality.sourceURL) {
            throw new Error('No source URL found for clip');
        }

        const mp4Url = `${sourceQuality.sourceURL}?sig=${clipData.playbackAccessToken.signature}&token=${encodeURIComponent(clipData.playbackAccessToken.value)}`;
        console.log(`Downloading clip ${id} from ${mp4Url}`);

        // 2. Download the file
        const writer = fs.createWriteStream(filePath);
        const response = await axios({
            url: mp4Url,
            method: 'GET',
            responseType: 'stream'
        });

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                res.json({ success: true, file_url: publicUrl });
                resolve();
            });
            writer.on('error', (err) => {
                console.error('File write error:', err);
                res.status(500).json({ success: false, error: 'Failed to save file' });
                reject(err);
            });
        });

    } catch (error) {
        console.error('Download error:', error.message);
        if (error.response?.data) {
            // Use util.inspect or just message to avoid circular JSON error
            console.error('GQL Error details:', error.response.data);
        }
        res.status(500).json({ success: false, error: 'Failed to download clip', details: error.message });
    }
};

module.exports = { downloadClip };
