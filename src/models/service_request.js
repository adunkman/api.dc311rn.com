const { URLSearchParams } = require('url');
const CustomError = require('./custom_error');
const JSONRestApiObject = require('./json_rest_api_object');

class ServiceRequestNotFoundError extends CustomError {
  constructor(number) {
    super(`No service request found with SERVICEREQUESTID = '${number}'.`);
  }
}

class AmbiguousServiceRequestIdError extends CustomError {
  constructor(number, count) {
    super(`${count} service requests were found with SERVICEREQUESTID = '${number}'.`);
  }
}

module.exports = class ServiceRequest extends JSONRestApiObject {
  static get pattern() {
    return /^(\d{2})-(\d{8})$/;
  }

  static get errors() {
    return Object.assign({}, super.errors, {
      ServiceRequestNotFoundError,
      AmbiguousServiceRequestIdError,
    });
  }

  static isServiceRequestId(id) {
    return this.pattern.test(id);
  }

  static endpointForServiceRequest(id) {
    const [ , year ] = id.match(this.pattern);
    return this.endpointForYear(Number(`20${year}`));
  }

  static endpointForYear(year) {
    return `https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/ServiceRequests/MapServer/${year - 2009}`;
  }

  static async count() {
    const endpoints = [];

    for (let year = new Date().getFullYear(); year >= 2009; year--) {
      endpoints.push(`${this.endpointForYear(year)}/query?count`);
    }

    endpoints.map()
  }

  static async all() {
    const endpoint = `${this.endpointForYear(new Date().getFullYear())}/query`;
    const query = {
      where: "1=1",
      orderByFields: "ADDDATE desc",
      outFields: "*",
      outSR: 4326,
      f: "json",
    };
    const url = `${endpoint}?${new URLSearchParams(query)}`;

    const [ services, { features } ] = await Promise.all([
      this.fetch('https://dc311api.herokuapp.com/v2/services.json'),
      this.fetch(url),
    ]);

    if (features.length < 100) {
      const endpoint2 = `${this.endpointForYear(new Date().getFullYear())}/query`;
      const url2 = `${endpoint2}?${new URLSearchParams(query)}`;

      const response = await this.fetch(url);
      features.concat(response.features);
    }

    return features.slice(0, 100).map(f => ServiceRequest.fromOpenData(f.attributes, services));
  }

  static async find(id) {
    const endpoint = `${this.endpointForServiceRequest(id)}/query`;
    const query = {
      where: `SERVICEREQUESTID = '${id}'`,
      outFields: "*",
      outSR: 4326,
      f: "json",
    };
    const url = `${endpoint}?${new URLSearchParams(query)}`;

    const [ services, { features } ] = await Promise.all([
      this.fetch('https://dc311api.herokuapp.com/v2/services.json'),
      this.fetch(url),
    ]);

    if (features.length === 0) {
      throw new ServiceRequestNotFoundError(id);
    }
    else if (features.length > 1) {
      throw new AmbiguousServiceRequestIdError(id, features.length);
    }
    else {
      return ServiceRequest.fromOpenData(features[0].attributes, services);
    }
  }

  static fromOpenData(attrs, services = []) {
    const trans = {
      OBJECTID: 'object_id',
      SERVICECODE: 'service_code',
      SERVICECODEDESCRIPTION: 'service_code_description',
      SERVICETYPECODEDESCRIPTION: 'service_type_code_description',
      ORGANIZATIONACRONYM: 'organization_acronym',
      SERVICECALLCOUNT: 'service_call_count',
      ADDDATE: 'add_date',
      RESOLUTIONDATE: 'resolution_date',
      SERVICEDUEDATE: 'service_due_date',
      SERVICEORDERDATE: 'service_order_date',
      INSPECTIONFLAG: 'inspection_flag',
      INSPECTIONDATE: 'inspection_date',
      INSPECTORNAME: 'inspector_name',
      SERVICEORDERSTATUS: 'service_order_status',
      STATUS_CODE: 'status_code',
      SERVICEREQUESTID: 'service_request_id',
      PRIORITY: 'priority',
      STREETADDRESS: 'street_address',
      LATITUDE: 'latitude',
      LONGITUDE: 'longitude',
      CITY: 'city',
      STATE: 'state',
      ZIPCODE: 'zip_code',
      MARADDRESSREPOSITORYID: 'map_address_repository_id',
      WARD: 'ward',
      DETAILS: 'details',
    };

    return new ServiceRequest(
      Object.keys(trans).reduce((obj, key) => ({ ...obj, [trans[key]]: attrs[key] }), {}),
      services.find(service => (
        service.service_code === attrs.SERVICECODE &&
        service.service_name === attrs.SERVICECODEDESCRIPTION &&
        service.agency === attrs.ORGANIZATIONACRONYM
      )),
    );
  }

  constructor(attributes, service = {}) {
    super();

    this.service_request_id = attributes.service_request_id;
    this.service_request_url = `https://api.dc311rn.com/service_requests/${attributes.service_request_id}`;
    this.status_code = attributes.status_code;
    this.priority = attributes.priority;
    this.details = attributes.details;
    this.call_count = attributes.service_call_count;
    this.added_at = attributes.add_date ? new Date(attributes.add_date) : null;
    this.resolved_at = attributes.resolution_date ? new Date(attributes.resolution_date) : null;

    this.source = {
      object_id: attributes.object_id,
      object_url: `${this.endpoint()}/query?f=json&outFields=*&objectIds=${attributes.object_id}`,
    };

    this.service_order = {
      ordered_at: attributes.service_order_date ? new Date(attributes.service_order_date) : null,
      status: attributes.service_order_status,
      due_at: attributes.service_due_date ? new Date(attributes.service_due_date) : null,
      service: {
        service_code: attributes.service_code,
        service_name: attributes.service_code_description,
        agency: attributes.organization_acronym,
        department: attributes.service_type_code_description,
        description: service.description,
        instructions: service.long_external_description,
        sla: Number(service.sla),
        sla_type: service.sla_type,
      },
    };

    this.location = {
      street_address: attributes.street_address,
      city: attributes.city,
      state: attributes.state,
      zip_code: attributes.zip_code,
      map_address_repository_id: attributes.map_address_repository_id,
      map_address_repository_url: `https://citizenatlas.dc.gov/newwebservices/locationverifier.asmx/findLocation2?f=json&str=${attributes.map_address_repository_id}`,
      latitude: attributes.latitude,
      longitude: attributes.longitude,
      ward: Number(attributes.ward),
    };

    this.inspection = {
      inspected_at: attributes.inspection_date ? new Date(attributes.inspection_date) : null,
      inspection_flag: attributes.inspection_flag,
      inspector_name: attributes.inspector_name,
    };
  }

  endpoint() {
    return this.constructor.endpointForServiceRequest(this.service_request_id);
  }
}
