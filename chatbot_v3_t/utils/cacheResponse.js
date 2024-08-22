const { dev } = require('../config');

function cacheResponse(res, seconds) {
  if (!dev) {
    res.set('Cache-Control', `public, max-age=${seconds}`);
  }
}

module.exports = cacheResponse;
