const apiResponse = require('../middleware/api_response');

exports.handler = apiResponse(async (event) => {
  return {
    statusCode: 200,
    body: {
      service_requests_url: 'https://api.dc311rn.com/service_requests',
    },
  };
});
