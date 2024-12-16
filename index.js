// Project Structure:
// /project
// ├── package.json
// ├── server.js
// ├── public/
// │   ├── index.html
// │   └── script.js
// └── views/

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
const port = 8000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory cache to store generated stats
const statsCache = new Map();

// New route to generate a unique badge URL
app.post('/generate-badge', async (req, res) => {
    const { platforms } = req.body;
    
    if (!platforms || platforms.length === 0) {
        return res.status(400).json({ error: 'Platform data is required' });
    }

    try {
        const statsPromises = platforms.map(async (platformInfo) => {
            const fullData = await fetchPlatformData(platformInfo.platform, platformInfo.username);
            
            // Filter data based on selected features
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

        // Generate a unique hash for this set of stats
        const statsKey = crypto.randomBytes(16).toString('hex');
        
        // Cache the stats with an expiration (e.g., 1 hour)
        statsCache.set(statsKey, {
            stats: statsResults,
            timestamp: Date.now()
        });

        // Return the badge URL
        res.json({ 
            badgeUrl: `http://localhost:8000/badge/${statsKey}`,
            statsKey: statsKey
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to generate badge', 
            details: error.message 
        });
    }
});

// Route to dynamically serve badge as SVG
app.get('/badge/:statsKey', (req, res) => {
    const { statsKey } = req.params;
    const cachedStats = statsCache.get(statsKey);

    // Check if stats exist and are not expired (1 hour)
    if (!cachedStats || (Date.now() - cachedStats.timestamp > 3600000)) {
        return res.status(404).send('Badge not found or expired');
    }

    // Generate SVG dynamically
    const svg = generateStatsBadgeSVG(cachedStats.stats);
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
});

// Function to generate SVG badge with dynamic sizing
function generateStatsBadgeSVG(stats) {
    // Constants for sizing
    const PLATFORM_WIDTH = 350;
    const BASE_HEIGHT = 100; // Reduced base height
    const FEATURE_HEIGHT = 25; // Height per feature
    const PADDING_TOP = 20;
    const PADDING_BOTTOM = 30;
    
    let svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${PLATFORM_WIDTH * stats.length}" height="auto" viewBox="0 0 ${PLATFORM_WIDTH * stats.length} auto">
            <style>
                .badge-bg { fill: #f6f8fa; }
                .platform-title { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; }
                .title { font-size: 16px; font-weight: bold; fill: #24292e; }
                .subtitle { font-size: 12px; fill: #6a737d; }
                .stat-label { font-size: 12px; fill: #6a737d; }
                .stat-value { font-size: 14px; font-weight: bold; fill: #24292e; }
            </style>
    `;

    stats.forEach((platformStats, index) => {
        const platform = platformStats.platform;
        const xOffset = index * PLATFORM_WIDTH;
        
        // Calculate dynamic height based on features
        let featureCount = Object.keys(platformStats).length - 1; // Subtract 'platform'
        const platformHeight = BASE_HEIGHT + (featureCount * FEATURE_HEIGHT) + PADDING_TOP + PADDING_BOTTOM;
        
        // Badge background
        svgContent += `
            <rect 
                x="${xOffset}" y="0" 
                width="${PLATFORM_WIDTH}" 
                height="${platformHeight}" 
                class="badge-bg" 
                rx="6" 
                ry="6" 
                stroke="#e1e4e8" 
                stroke-width="1"
            />
            
            <!-- Platform Icon (placeholder) -->
            <rect 
                x="${xOffset + 20}" y="${PADDING_TOP}" 
                width="40" height="40" 
                rx="6" 
                ry="6" 
                fill="#${getColorForPlatform(platform)}"
            />
            
            <!-- Platform Title -->
            <text 
                x="${xOffset + 70}" y="${PADDING_TOP + 20}" 
                class="title platform-title"
                font-size="16"
                font-weight="600"
            >
                ${platform.replace(/_/g, ' ')}
            </text>
            <text 
                x="${xOffset + 70}" y="${PADDING_TOP + 40}" 
                class="subtitle platform-title"
                font-size="12"
            >
                Profile Statistics
            </text>
        `;

        // Render all selected features
         featureCount = 0;
        for (const [key, value] of Object.entries(platformStats)) {
            if (key !== 'platform') {
                const formattedKey = key.replace(/_/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase());
                
                const yPosition = PADDING_TOP + 60 + (featureCount * FEATURE_HEIGHT);
                
                svgContent += `
                    <text 
                        x="${xOffset + 20}" 
                        y="${yPosition}" 
                        class="stat-label platform-title"
                    >
                        ${formattedKey}
                    </text>
                    <text 
                        x="${xOffset + 320}" 
                        y="${yPosition}" 
                        class="stat-value platform-title"
                        text-anchor="end"
                    >
                        ${value}
                    </text>
                    <line 
                        x1="${xOffset + 20}" 
                        y1="${yPosition + 5}" 
                        x2="${xOffset + 320}" 
                        y2="${yPosition + 5}" 
                        stroke="#e1e4e8" 
                        stroke-width="0.5"
                    />
                `;
                featureCount++;
            }
        }

        // Last updated timestamp
        svgContent += `
            <text 
                x="${xOffset + 20}" 
                y="${platformHeight - 10}" 
                class="subtitle platform-title"
                font-size="10"
            >
                Last Updated: ${new Date().toLocaleString()}
            </text>
        `;
    });

    svgContent += `</svg>`;

    return svgContent;
}

// Helper function to generate consistent colors for platforms
function getColorForPlatform(platform) {
    const platformColors = {
        'github': '24292e',
        'leetcode_stats': '0a84ff',
        'leetcode_contests': 'ffd700'
    };
    
    return platformColors[platform] || '4a4a4a';
}

// Clean up expired stats periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of statsCache.entries()) {
        if (now - value.timestamp > 3600000) {
            statsCache.delete(key);
        }
    }
}, 3600000); // Run every hour


// Comprehensive Platforms Configuration
const PLATFORMS = {
    github: {
        name: 'GitHub',
        features: [
            'avatar_url', 'name', 'login', 'bio', 'public_repos', 
            'followers', 'following', 'created_at', 'total_contributions', 
            'html_url', 'company', 'blog', 'location', 'email', 'hireable'
        ]
    },
    leetcode_stats: {
        name: 'LeetCode Stats',
        features: [
            'totalSolved', 'totalQuestions', 'easySolved', 'totalEasy', 
            'mediumSolved', 'totalMedium', 'hardSolved', 'totalHard', 
            'acceptanceRate', 'ranking', 'contributionPoints', 'reputation'
        ]
    },
    leetcode_contests: {
        name: 'LeetCode Contests',
        features: [
            'attendedContestsCount', 'rating', 'globalRanking', 
            'totalParticipants', 'topPercentage'
        ]
    }
};

// Utility function to fetch data from different platforms
async function fetchPlatformData(platform, username) {
    try {
        switch(platform) {
            case 'github':
                const githubResponse = await axios.get(`https://api.github.com/users/${username}`);
                
                // Attempt to get total contributions
                let totalContributions = 0;
                try {
                    const contributionsResponse = await axios.get(`https://api.github.com/users/${username}/events`);
                    totalContributions = contributionsResponse.data.length;
                } catch (contribError) {
                    console.warn('Could not fetch total contributions');
                }

                return {
                    ...githubResponse.data,
                    total_contributions: totalContributions
                };

            case 'leetcode_stats':
                const leetcodeStatsResponse = await axios.get(`https://leetcode-stats-api.herokuapp.com/${username}`);
                return leetcodeStatsResponse.data;

            case 'leetcode_contests':
                const leetcodeContestsResponse = await axios.post('https://leetcode.com/graphql', {
                    query: `{
                        userContestRanking(username:"${username}") {
                            attendedContestsCount
                            rating
                            globalRanking
                            totalParticipants
                            topPercentage
                        }
                    }`
                });
                return leetcodeContestsResponse.data.data.userContestRanking;

            default:
                throw new Error('Unsupported platform');
        }
    } catch (error) {
        console.error(`Error fetching data for ${platform}:`, error);
        throw error;
    }
}

// Generate markdown snippet
function generateMarkdownSnippet(platformData) {
    let markdown = '## My Profile Stats\n\n';
    
    Object.entries(platformData).forEach(([platform, data]) => {
        markdown += `### ${PLATFORMS[platform].name}\n`;
        
        Object.entries(data).forEach(([feature, value]) => {
            if (value !== null && value !== undefined) {
                markdown += `- ${PLATFORMS[platform].features[feature] || feature}: ${value}\n`;
            }
        });
        
        markdown += '\n';
    });

    return markdown;
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index'));
});

// Get available platforms and their features
app.get('/platforms', (req, res) => {
    res.json(PLATFORMS);
});

// Generate profile stats
app.post('/generate-stats', async (req, res) => {
    const { platforms } = req.body;
    
    if (!platforms || platforms.length === 0) {
        return res.status(400).json({ error: 'Platform data is required' });
    }

    try {
        const platformResults = {};
        const statsPromises = platforms.map(async (platformInfo) => {
            const fullData = await fetchPlatformData(platformInfo.platform, platformInfo.username);
            
            // Filter data based on selected features
            const filteredData = {};
            if (platformInfo.features) {
                platformInfo.features.forEach(feature => {
                    if (fullData[feature] !== undefined) {
                        filteredData[feature] = fullData[feature];
                    }
                });
            } else {
                // If no specific features selected, use all data
                return fullData;
            }
            
            return {
                platform: platformInfo.platform,
                ...filteredData
            };
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
});

// Add error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke! Check the server logs.');
});

app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
});

// Export for potential testing
module.exports = app;