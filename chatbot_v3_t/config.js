require('dotenv').config();
const config = {
  dev: process.env.NODE_ENV !== 'production',
  port: process.env.NODE_PORT || 3000,
  postgre: {
    user: process.env.DB_USER_POSTGRES,
    password: process.env.DB_PASSWORD_POSTGRES,
    host: process.env.DB_HOST_POSTGRES,
    port: process.env.DB_PORT_POSTGRES,
    database: process.env.DB_DATABASE_POSTGRES,
    maxpool: process.env.DB_MAXPOOL_POSTGRES
  }
};

module.exports = config;