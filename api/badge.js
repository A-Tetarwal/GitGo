const { statsCache } = require('./statsCache');
const { generateStatsBadgeSVG } = require('./utils');

module.exports = (req, res) => {
    const { statsKey } = req.query;
    const cachedStats = statsCache.get(statsKey);

    if (!cachedStats || (Date.now() - cachedStats.timestamp > 3600000)) {
        return res.status(404).send('Badge not found or expired');
    }

    const svg = generateStatsBadgeSVG(cachedStats.stats);
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
};
