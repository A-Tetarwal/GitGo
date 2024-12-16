const axios = require('axios');
const crypto = require('crypto');
const { fetchPlatformData } = require('./utils');
const { statsCache } = require('./statsCache');

module.exports = async (req, res) => {
    const { platforms } = req.body;
    
    if (!platforms || platforms.length === 0) {
        return res.status(400).json({ error: 'Platform data is required' });
    }

    try {
        const statsPromises = platforms.map(async (platformInfo) => {
            const fullData = await fetchPlatformData(platformInfo.platform, platformInfo.username);
            const filteredData = {};
            if (platformInfo.features) {
                platformInfo.features.forEach(feature => {
                    if (fullData[feature] !== undefined) {
                        filteredData[feature] = fullData[feature];
                    }
                });
            }
            return {
                platform: platformInfo.platform,
                ...filteredData
            };
        });

        const statsResults = await Promise.all(statsPromises);

        const statsKey = crypto.randomBytes(16).toString('hex');
        
        statsCache.set(statsKey, {
            stats: statsResults,
            timestamp: Date.now()
        });

        res.json({ 
            badgeUrl: `/api/badge/${statsKey}`,
            statsKey: statsKey
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to generate badge', 
            details: error.message 
        });
    }
};
