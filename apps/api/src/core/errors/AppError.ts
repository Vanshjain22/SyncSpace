/**
 * Base application error class.
 *
 * Extends the native Error with properties needed for structured
 * error responses and proper operational vs programmer error distinction.
 *
 * - `isOperational: true` → expected errors (user input, resource not found, etc.)
 *   These are safe to send to the client.
 *
 * - `isOperational: false` → unexpected errors (bugs, programming mistakes)
 *   These should trigger alerts and NEVER expose internal details to the client.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor({
    message,
    statusCode,
    errorCode,
    isOperational = true,
    details,
  }: {
    message: string;
    statusCode: number;
    errorCode: string;
    isOperational?: boolean;
    details?: Record<string, unknown>;
  }) {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Ensure instanceof checks work correctly when extending built-ins
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Serializes the error to a JSON-safe object suitable for API responses.
   */
  public toJSON() {
    return {
      success: false,
      error: {
        code: this.errorCode,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
      statusCode: this.statusCode,
    };
  }
}
