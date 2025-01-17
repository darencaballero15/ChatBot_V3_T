exports.success = function (req, res, message = '', status = 200) {
  res.status(status).send({
    error: false,
    status,
    body: message,
  });
};

exports.error = function (
  req,
  res,
  error = 'Internal server error',
  status = 500
) {
  res.status(status).send({
    error,
    status,
    body: false,
  });
};
