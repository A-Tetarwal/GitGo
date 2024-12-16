const { fetchPlatformData } = require('./utils');
const { generateMarkdownSnippet } = require('./utils');

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
            } else {
                return fullData;
            }
            return { platform: platformInfo.platform, ...filteredData };
        });

        const statsResults = await Promise.all(statsPromises);

        const markdownSnippet = generateMarkdownSnippet(
            statsResults.reduce((acc, stat) => {
                acc[stat.platform] = {...stat};
                delete acc[stat.platform].platform;
                return acc;
            }, {})
        );

        res.json({
            stats: statsResults,
            markdownSnippet: markdownSnippet
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to fetch profile stats', 
            details: error.message 
        });
    }
};
