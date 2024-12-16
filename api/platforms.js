const { PLATFORMS } = require('./utils');

module.exports = (req, res) => {
    res.json(PLATFORMS);
};
