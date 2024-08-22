const response = require('../response');
const config = require('../../config');
const boom = require('@hapi/boom');

function logError(err, req, res, next) {
  next(err);
}

function wrapError(err, req, res, next) {
  if (!err.isBoom) {
    //boom.badImplementation(err)
    next(boom.teapot(err));
  }

  next(err);
}

function error(err, req, res, next) {
  const {
    output: { statusCode, payload },
  } = err;
  let responseError = {};
  let message = payload;
  responseError.message = message;
  if (config.dev) {
    responseError.stack = err.stack;
  }

 // console.log('JEJE responseError=>', responseError)
  response.error(req, res, responseError, statusCode);
}

module.exports = {
  logError,
  wrapError,
  error,
};
