const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
require('dotenv').config();

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/auth/tiktok/callback';

// Scopes needed for publishing
const SCOPES = 'user.info.basic,video.upload,video.publish';

let accessToken = null;
let openId = null;

/**
 * Generates the TikTok OAuth authorization URL
 */
const getAuthUrl = () => {
    const csrfState = Math.random().toString(36).substring(7);
    let url = 'https://www.tiktok.com/v2/auth/authorize/';
    url += `?client_key=${CLIENT_KEY}`;
    url += `&scope=${SCOPES}`;
    url += `&response_type=code`;
    url += `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
    url += `&state=${csrfState}`;
    return url;
};

/**
 * Exchanges the auth code for an access token
 */
const getAccessToken = async (code) => {
    try {
        const params = new URLSearchParams();
        params.append('client_key', CLIENT_KEY);
        params.append('client_secret', CLIENT_SECRET);
        params.append('code', code);
        params.append('grant_type', 'authorization_code');
        params.append('redirect_uri', REDIRECT_URI);

        const response = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (response.data.access_token) {
            accessToken = response.data.access_token;
            openId = response.data.open_id;
            console.log('✅ TikTok Access Token retrieved');
            return { success: true, ...response.data };
        } else {
            console.error('❌ Failed to get access token:', response.data);
            return { success: false, error: response.data };
        }

    } catch (error) {
        console.error('TikTok Auth Error:', error.response ? error.response.data : error.message);
        throw error;
    }
};

/**
 * Uploads a video to TikTok
 * @param {string} filePath - Path to the video file
 * @param {string} title - Caption for the video
 */
const uploadVideo = async (filePath, title) => {
    if (!accessToken) {
        throw new Error('No access token. Please authenticate first.');
    }

    try {
        const fileSize = fs.statSync(filePath).size;

        // 1. Initialize Upload
        console.log('📤 Initializing TikTok Upload...');
        const initBody = {
            post_info: {
                title: title,
                privacy_level: 'PUBLIC_TO_EVERYONE', // or MUTUAL_FOLLOW_FRIENDS, SELF_ONLY
                disable_duet: false,
                disable_comment: false,
                disable_stitch: false,
                video_cover_timestamp_ms: 1000
            },
            source_info: {
                source: 'FILE_UPLOAD',
                video_size: fileSize,
                chunk_size: fileSize, // Direct upload for now (max 64MB for chunks, check limits)
                total_chunk_count: 1
            }
        };

        const initResponse = await axios.post('https://open.tiktokapis.com/v2/post/publish/video/init/', initBody, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json; charset=UTF-8'
            }
        });

        const { upload_url } = initResponse.data.data;

        if (!upload_url) {
            throw new Error('Failed to get upload URL from TikTok');
        }

        // 2. Upload Video File
        console.log('🚀 Uploading video file...');
        const fileStream = fs.createReadStream(filePath);

        await axios.put(upload_url, fileStream, {
            headers: {
                'Content-Type': 'video/mp4',
                'Content-Length': fileSize,
                'Content-Range': `bytes 0-${fileSize - 1}/${fileSize}`
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity
        });

        console.log('✅ Video uploaded successfully!');
        return { success: true, message: 'Video published/scheduled successfully' };

    } catch (error) {
        console.error('TikTok Upload Error:', error.response ? error.response.data : error.message);
        // Clean error object for frontend
        const errMsg = error.response?.data?.error?.message || error.message;
        throw new Error(`TikTok Upload Failed: ${errMsg}`);
    }
};

const isAuthenticated = () => !!accessToken;

module.exports = {
    getAuthUrl,
    getAccessToken,
    uploadVideo,
    isAuthenticated
};
