class AppError extends Error {
  constructor(code, httpStatus = 400, message = code) {
    super(message);

    this.name = 'AppError';
    this.code = code;
    this.httpStatus = httpStatus;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
