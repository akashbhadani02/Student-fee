// Backward-compatible API entrypoint. Vercel should route /api/state to api/state.js.
module.exports = require('./state');
