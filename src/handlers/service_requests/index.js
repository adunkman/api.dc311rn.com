const serviceRequestFactory = require('../../factories/service_request');
const apiResponse = require('../../middleware/api_response');

exports.handler = apiResponse(async ({requestContext}) => {
  const ServiceRequest = serviceRequestFactory(requestContext.requestId);

  let statusCode = 200;
  let body;

  try {
    body = await ServiceRequest.all();
  }
  catch (error) {
    body = error;

    if (error instanceof ServiceRequest.errors.ApiUnavailableError) {
      statusCode = 504;
    }
    else {
      throw error;
    }
  }

  return { statusCode, body };
});
