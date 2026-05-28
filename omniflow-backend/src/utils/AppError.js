class AppError extends Error {
    constructor(message, statusCode) {
        super(message);          // Call the parent Error class
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;  // Distinguishes our errors from bugs

        // Captures the stack trace, excluding this constructor from it
        Error.captureStackTrace(this, this.constructor);
    }
}

export default AppError;