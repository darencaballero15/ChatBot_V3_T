const express = require('express');
const config = require('./config');
const debug = require('debug');
const http = require('http');
const morgan = require('morgan');
const cors = require('cors')
const path = require('path')
const ejs = require('ejs')



const { logError, wrapError, error } = require('./network/middlewares/error');
const notFoundHandler = require('./network/middlewares/notFoundHandler');


const app = express();
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')
const server = http.createServer(app);
const routers = require('./network/router');

/**Middlewares */
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors())
app.use(morgan('dev'))
app.use(express.urlencoded({ extended: true}));
app.use(express.json());

/**routes */
routers(app);

/**Error Middleware */
app.use(logError);
app.use(wrapError);
app.use(error);

app.use(notFoundHandler);


process.on("unhandledRejection", e => {
  console.log("unhandledRejection", e);
});

/**run server */
server.listen(config.port, async function () {
  console.log(`Server running in http://localhost:${config.port}`);
  debug(`Server running in http://localhost:${config.port}`)
});


