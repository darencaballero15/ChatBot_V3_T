const store = require('../../../store/remote-micro-db');
const ctr = require('./services');
  
module.exports = ctr(store);
