const remote = require("./remote");
const config = require("../config");

module.exports = new remote(config.postgre.user, config.postgre.password, config.postgre.host, config.postgre.port, config.postgre.database, config.postgre.maxpool);
