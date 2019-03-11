const ServiceRequest = require('../models/service_request');

module.exports = (request_id) => {
  const metadata = { request_id }

  return class ServiceRequestWithMetadata extends ServiceRequest {
    static get metadata() {
      return metadata;
    }
  };
};
