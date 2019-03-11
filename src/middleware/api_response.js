const CustomError = require('../models/custom_error');

class InternalServerError extends CustomError {
  constructor(error) {
    super(`An unexpected error occurred. ${error.code ? `${error.code} ` : ''}${error.message}`);
  }
}

const errorResponse = (error) => {
  return {
    statusCode: 500,
    body: new InternalServerError(error),
  }
};

module.exports = (handler) => async (...args) => {
  let response;

  try {
    response = await handler(...args);
  }
  catch (error) {
    response = errorResponse(error);
  }

  return {
    statusCode: response.statusCode,
    headers: {
      'Content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(response.body, null, 2),
  };
};
