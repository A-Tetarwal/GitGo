const axios = require('axios');

const fetchPlatformData = async (platform, username) => {
    try {
        switch(platform) {
            case 'github':
                const githubResponse = await axios.get(`https://api.github.com/users/${username}`);
                let totalContributions = 0;
                try {
                    const contributionsResponse = await axios.get(`https://api.github.com/users/${username}/events`);
                    totalContributions = contributionsResponse.data.length;
                } catch (contribError) {
                    console.warn('Could not fetch total contributions');
                }
                return { ...githubResponse.data, total_contributions: totalContributions };

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
};

const generateStatsBadgeSVG = (stats) => {
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
    
};

const generateMarkdownSnippet = (platformData) => {
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
};

module.exports = {
    fetchPlatformData,
    generateStatsBadgeSVG,
    generateMarkdownSnippet
};
