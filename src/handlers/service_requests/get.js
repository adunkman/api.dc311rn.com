const serviceRequestFactory = require('../../factories/service_request');
const CustomError = require('../../models/custom_error');
const apiResponse = require('../../middleware/api_response');

class InvalidServiceRequestIdError extends CustomError {
  constructor(id) {
    super(`'${id}' is not a valid Service Request Id (${pattern}).`);
  }
}

exports.handler = apiResponse(async ({requestContext, pathParameters = {}}) => {
  const ServiceRequest = serviceRequestFactory(requestContext.requestId);
  const id = pathParameters.id;

  if (!ServiceRequest.isServiceRequestId(id)) {
    return {
      statusCode: 400,
      body: new InvalidServiceRequestIdError(id, ServiceRequest.pattern),
    };
  }

  let statusCode = 200;
  let body;

  try {
    body = await ServiceRequest.find(id);
  }
  catch (error) {
    body = error;

    if (error instanceof ServiceRequest.errors.ServiceRequestNotFoundError) {
      statusCode = 404;
    }
    else if (error instanceof ServiceRequest.errors.AmbiguousServiceRequestIdError) {
      statusCode = 502;
    }
    else if (error instanceof ServiceRequest.errors.ApiUnavailableError) {
      statusCode = 504;
    }
  }

  return { statusCode, body };
});
