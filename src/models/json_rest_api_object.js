const fetch = require('node-fetch');
const CustomError = require('./custom_error');

class ApiUnavailableError extends CustomError {
  constructor(error) {
    super(error.message)
  }
}

module.exports = class JSONRestApiObject {
  static get errors() {
    return {
      ApiUnavailableError,
    };
  }

  static get metadata() {
    return {};
  }

  static async fetch(url) {
    let body;

    try {
      const startedAt = Date.now()

      const response = await fetch(url, {
        headers: {
          'User-Agent': `api.dc311rn.com request_id='${this.metadata.request_id}'`
        }
      });
      body = await response.json();

      console.log({
        url,
        status: response.status,
        duration_in_ms: Date.now() - startedAt,
      });
    }
    catch (error) {
      throw new ApiUnavailableError(error);
    }

    return body;
  }
}
