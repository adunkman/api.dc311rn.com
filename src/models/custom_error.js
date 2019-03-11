module.exports = class CustomError extends Error {
  constructor(...args) {
    super(args)
    this.name = this.constructor.name;
    this.__proto__ = this.constructor.prototype;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      type: this.name,
      message: this.message,
      stack: this.stack.split('\n'),
      source_code_url: "https://github.com/adunkman/api.dc311rn.com",
    };
  }
}
