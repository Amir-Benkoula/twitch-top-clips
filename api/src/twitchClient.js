const axios = require('axios');
require('dotenv').config();

let accessToken = null;
let tokenExpiration = null;

const getAccessToken = async () => {
    if (accessToken && tokenExpiration && Date.now() < tokenExpiration) {
        return accessToken;
    }

    try {
        const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
            params: {
                client_id: process.env.TWITCH_CLIENT_ID,
                client_secret: process.env.TWITCH_CLIENT_SECRET,
                grant_type: 'client_credentials',
            },
        });

        accessToken = response.data.access_token;
        // Set expiration slightly before actual expiry to be safe (expires_in is in seconds)
        tokenExpiration = Date.now() + (response.data.expires_in - 60) * 1000;
        console.log('New Access Token generated');
        return accessToken;
    } catch (error) {
        console.error('Error fetching access token:', error.response ? error.response.data : error.message);
        throw new Error('Failed to obtain Twitch access token');
    }
};

const getTopGamesAndClips = async () => {
    const token = await getAccessToken();
    const clientId = process.env.TWITCH_CLIENT_ID;

    const headers = {
        'Client-Id': clientId,
        'Authorization': `Bearer ${token}`,
    };

    try {
        // 1. Get Top 25 Games (Increased from 10)
        const gamesResponse = await axios.get('https://api.twitch.tv/helix/games/top', {
            headers,
            params: {
                first: 50,
            },
        });

        const games = gamesResponse.data.data;
        const result = [];

        // Calculate date 7 days ago for "Top of the Week"
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        const startedAt = startDate.toISOString();
        const endedAt = new Date().toISOString();

        // 2. For each game, get clips
        for (const game of games) {
            try {
                // Fetch up to 100 clips (Twitch API Max per request)
                const clipsResponse = await axios.get('https://api.twitch.tv/helix/clips', {
                    headers,
                    params: {
                        game_id: game.id,
                        first: 100,
                        started_at: startedAt,
                        ended_at: endedAt,
                    },
                });

                // Filter for French language and take top 50 (Increased from 20)
                const frClips = clipsResponse.data.data
                    .filter(clip => clip.language === 'fr')
                    .slice(0, 50);

                if (frClips.length > 0) {
                    result.push({
                        game_info: {
                            id: game.id,
                            name: game.name,
                            box_art_url: game.box_art_url,
                        },
                        top_clips: frClips.map(clip => ({
                            id: clip.id,
                            url: clip.url,
                            title: clip.title,
                            view_count: clip.view_count,
                            created_at: clip.created_at,
                            thumbnail_url: clip.thumbnail_url,
                            broadcaster_name: clip.broadcaster_name,
                            duration: clip.duration,
                        })),
                    });
                }
            } catch (clipError) {
                console.error(`Error fetching clips for game ${game.name}:`, clipError.message);
            }
        }

        return result;

    } catch (error) {
        console.error('Error in getTopGamesAndClips:', error.response ? error.response.data : error.message);
        throw error;
    }
};

const TOP_FR_STREAMERS = [
    'gotaga', 'kamet0', 'jl_tomy', 'locklear', 'squeezie', 'domingo', 'zerator', 'aminematue',
    'inoxtag', 'michou', 'chowh1', 'pfut', 'corobizar', 'mistermv', 'ponce', 'etoiles',
    'maghla', 'jeel', 'billy', 'grimkujow', 'rebeudeter', 'antoinedaniel', 'bagherajones',
    'horty', 'rivenzi', 'ultia', 'altair'
];

const getTopStreamersAndClips = async () => {
    const token = await getAccessToken();
    const clientId = process.env.TWITCH_CLIENT_ID;

    const headers = {
        'Client-Id': clientId,
        'Authorization': `Bearer ${token}`,
    };

    try {
        // 1. Get User IDs for the hardcoded list
        // Twitch allows up to 100 logins per request
        const queryParams = TOP_FR_STREAMERS.map(name => `login=${name}`).join('&');
        const usersResponse = await axios.get(`https://api.twitch.tv/helix/users?${queryParams}`, { headers });
        const users = usersResponse.data.data;

        const result = [];

        // Calculate date 7 days ago
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        const startedAt = startDate.toISOString();
        const endedAt = new Date().toISOString();

        // 2. For each streamer, get top clips
        // Use Promise.all for parallelism to speed up
        await Promise.all(users.map(async (user) => {
            try {
                const clipsResponse = await axios.get('https://api.twitch.tv/helix/clips', {
                    headers,
                    params: {
                        broadcaster_id: user.id,
                        first: 20, // Top 20 clips per streamer
                        started_at: startedAt,
                        ended_at: endedAt,
                    },
                });

                const clips = clipsResponse.data.data;

                if (clips.length > 0) {
                    result.push({
                        streamer_info: {
                            id: user.id,
                            name: user.display_name,
                            login: user.login,
                            profile_image_url: user.profile_image_url,
                        },
                        top_clips: clips.map(clip => ({
                            id: clip.id,
                            url: clip.url,
                            title: clip.title,
                            view_count: clip.view_count,
                            created_at: clip.created_at,
                            thumbnail_url: clip.thumbnail_url,
                            broadcaster_name: clip.broadcaster_name,
                            duration: clip.duration,
                        })),
                    });
                }
            } catch (err) {
                console.error(`Error fetching clips for ${user.display_name}:`, err.message);
            }
        }));

        // Sort result by total views of the first clip (most popular streamer first)?
        // Or just map to the original order?
        // Let's sort by the view count of the top clip to show "hottest" streamers first
        result.sort((a, b) => {
            const maxViewA = a.top_clips.length > 0 ? a.top_clips[0].view_count : 0;
            const maxViewB = b.top_clips.length > 0 ? b.top_clips[0].view_count : 0;
            return maxViewB - maxViewA;
        });

        return result;

    } catch (error) {
        console.error('Error in getTopStreamersAndClips:', error.message);
        throw error;
    }
};

module.exports = { getTopGamesAndClips, getTopStreamersAndClips };
