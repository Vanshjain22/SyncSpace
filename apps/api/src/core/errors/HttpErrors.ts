import { AppError } from "./AppError";

/**
 * Concrete HTTP error classes.
 *
 * Use these throughout the service layer — never throw raw Error objects
 * or send manual res.status().json() calls from controllers.
 */

export class BadRequestError extends AppError {
  constructor(message = "Bad Request", details?: Record<string, unknown>) {
    super({ message, statusCode: 400, errorCode: "BAD_REQUEST", details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized — authentication required") {
    super({ message, statusCode: 401, errorCode: "UNAUTHORIZED" });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden — insufficient permissions") {
    super({ message, statusCode: 403, errorCode: "FORBIDDEN" });
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super({
      message: `${resource} not found`,
      statusCode: 404,
      errorCode: "NOT_FOUND",
    });
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super({ message, statusCode: 409, errorCode: "CONFLICT" });
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(message = "Unprocessable entity", details?: Record<string, unknown>) {
    super({ message, statusCode: 422, errorCode: "UNPROCESSABLE_ENTITY", details });
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests — please slow down") {
    super({ message, statusCode: 429, errorCode: "RATE_LIMITED" });
  }
}

export class InternalServerError extends AppError {
  constructor(message = "An unexpected error occurred") {
    super({
      message,
      statusCode: 500,
      errorCode: "INTERNAL_SERVER_ERROR",
      isOperational: false,
    });
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = "Service temporarily unavailable") {
    super({
      message,
      statusCode: 503,
      errorCode: "SERVICE_UNAVAILABLE",
    });
  }
}

export class ValidationError extends AppError {
  constructor(details: Record<string, unknown>) {
    super({
      message: "Validation failed",
      statusCode: 422,
      errorCode: "VALIDATION_ERROR",
      details,
    });
  }
}
