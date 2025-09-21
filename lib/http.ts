/**
 * HTTP Utilities for consistent API responses and error handling
 *
 * This module provides standardized response helpers for all API routes,
 * ensuring consistent error shapes and proper HTTP status codes.
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Standard error response shape for all API endpoints
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: string | object;
  reason?: string; // User-facing explanation of why the error occurred
}

/**
 * Standard success response shape for all API endpoints
 */
export interface SuccessResponse<T = any> {
  success: true;
  data?: T;
  [key: string]: any;
}

/**
 * Creates a successful JSON response with consistent structure
 *
 * @param data - Response data or response object
 * @param status - HTTP status code (default: 200)
 * @returns NextResponse with standardized success format
 *
 * @example
 * ```typescript
 * // Simple data response
 * return jsonOk({ users: userList });
 *
 * // Custom response with additional fields
 * return jsonOk({
 *   results: queryResults,
 *   epsilon: 1.0,
 *   timestamp: new Date().toISOString()
 * });
 *
 * // Created response
 * return jsonOk({ id: newId }, 201);
 * ```
 */
export function jsonOk<T = any>(
  data?: T,
  status = 200,
): NextResponse<SuccessResponse<T>> {
  const response: SuccessResponse<T> = {
    success: true,
    ...(data !== null && data !== undefined && { data }),
  };

  // If data is an object with additional fields (not just a simple data payload),
  // merge those fields into the response
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const dataObj = data as Record<string, any>;
    // If the data object has fields other than typical "data" fields, merge them
    if (
      "results" in dataObj ||
      "epsilon" in dataObj ||
      "timestamp" in dataObj ||
      "recordCount" in dataObj
    ) {
      Object.assign(response, dataObj);
      delete (response as any).data; // Remove redundant data field
    }
  }

  return NextResponse.json(response, { status });
}

/**
 * Creates an error JSON response with consistent structure
 *
 * @param status - HTTP status code
 * @param code - Error code for programmatic handling
 * @param message - Human-readable error message
 * @param details - Additional error details (optional)
 * @param reason - User-facing explanation of why the error occurred (optional)
 * @returns NextResponse with standardized error format
 *
 * @example
 * ```typescript
 * // Simple error
 * return jsonError(404, 'NOT_FOUND', 'Resource not found');
 *
 * // Error with user-facing reason
 * return jsonError(403, 'CONSENT_EXPIRED', 'Access denied', undefined,
 *   "Your consent for 'health' data under 'telemedicine' purpose has expired");
 *
 * // Error with details and reason
 * return jsonError(400, 'VALIDATION_ERROR', 'Invalid input', {
 *   field: 'email',
 *   reason: 'Invalid email format'
 * }, 'Please check your email address and try again');
 * ```
 */
export function jsonError(
  status: number,
  code: string,
  message: string,
  details?: string | object,
  reason?: string,
): NextResponse<ErrorResponse> {
  const response: ErrorResponse = {
    success: false,
    error: message,
    code,
    ...(details !== undefined && { details }),
    ...(reason !== undefined && { reason }),
  };

  return NextResponse.json(response, { status });
}

/**
 * Maps Zod validation errors to standardized 400 responses
 *
 * @param error - ZodError from validation
 * @param message - Optional custom error message
 * @param reason - Optional user-facing reason for the validation failure
 * @returns NextResponse with formatted validation error
 *
 * @example
 * ```typescript
 * try {
 *   const validData = schema.parse(requestData);
 *   // ... process valid data
 * } catch (error) {
 *   if (error instanceof ZodError) {
 *     return zodError(error, 'Invalid request data', 'Please check your input and try again');
 *   }
 *   throw error;
 * }
 * ```
 */
export function zodError(
  error: ZodError,
  message = "Validation failed",
  reason?: string,
): NextResponse<ErrorResponse> {
  const details = error.errors.map((err) => ({
    path: err.path.join("."),
    message: err.message,
    code: err.code,
    ...(err.code === "invalid_union" && { received: (err as any).received }),
    ...(err.code === "invalid_type" && {
      expected: (err as any).expected,
      received: (err as any).received,
    }),
  }));

  return jsonError(400, "VALIDATION_ERROR", message, details, reason);
}

/**
 * Handles common API errors with appropriate HTTP responses
 *
 * @param error - Error object to handle
 * @returns NextResponse with appropriate error format
 *
 * @example
 * ```typescript
 * try {
 *   // ... API logic
 * } catch (error) {
 *   return handleApiError(error);
 * }
 * ```
 */
export function handleApiError(error: unknown): NextResponse<ErrorResponse> {
  console.error("API Error:", error);

  // Handle HttpError instances from guards
  if (
    error instanceof Error &&
    "status" in error &&
    "code" in error &&
    "reason" in error
  ) {
    const httpError = error as any;
    return jsonError(
      httpError.status,
      httpError.code,
      httpError.message,
      undefined,
      httpError.reason,
    );
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return zodError(error);
  }

  // Handle known error types
  if (error instanceof Error) {
    const message = error.message;

    // Authentication errors
    if (
      message.includes("unauthorized") ||
      message.includes("authentication")
    ) {
      return jsonError(
        401,
        "UNAUTHORIZED",
        "Authentication required",
        undefined,
        "Please provide valid authentication credentials to access this resource",
      );
    }

    // Authorization errors
    if (message.includes("forbidden") || message.includes("permission")) {
      return jsonError(
        403,
        "FORBIDDEN",
        "Insufficient permissions",
        undefined,
        "You do not have the necessary permissions to perform this action",
      );
    }

    // Not found errors
    if (message.includes("not found")) {
      return jsonError(
        404,
        "NOT_FOUND",
        "Resource not found",
        undefined,
        "The requested resource could not be found. Please check the URL and try again",
      );
    }

    // Conflict errors
    if (message.includes("already exists") || message.includes("conflict")) {
      return jsonError(
        409,
        "CONFLICT",
        "Resource conflict",
        undefined,
        "This resource already exists or conflicts with an existing resource",
      );
    }

    // Rate limiting errors
    if (
      message.includes("rate limit") ||
      message.includes("too many requests")
    ) {
      return jsonError(429, "RATE_LIMIT_EXCEEDED", "Too many requests");
    }

    // Generic error with error message
    return jsonError(500, "INTERNAL_ERROR", "Internal server error", {
      message: process.env.NODE_ENV === "development" ? message : undefined,
    });
  }

  // Unknown error
  return jsonError(500, "UNKNOWN_ERROR", "An unexpected error occurred");
}

/**
 * Validates that a request has a valid session
 *
 * @param session - Session object from NextAuth
 * @returns Error response if session is invalid, null if valid
 */
export function validateSession(
  session: any,
): NextResponse<ErrorResponse> | null {
  if (!session?.user?.id) {
    return jsonError(401, "UNAUTHORIZED", "Authentication required");
  }
  return null;
}

/**
 * Validates API key authentication
 *
 * @param authorization - Authorization header value
 * @param expectedKey - Expected API key
 * @returns Error response if key is invalid, null if valid
 */
export function validateApiKey(
  authorization: string | null,
  expectedKey: string,
): NextResponse<ErrorResponse> | null {
  if (!authorization) {
    return jsonError(401, "UNAUTHORIZED", "API key required");
  }

  const token = authorization.replace(/^Bearer\s+/i, "");
  if (token !== expectedKey) {
    return jsonError(401, "UNAUTHORIZED", "Invalid API key");
  }

  return null;
}

/**
 * Validates request content type
 *
 * @param request - Request object
 * @param expectedType - Expected content type (default: 'application/json')
 * @returns Error response if content type is invalid, null if valid
 */
export function validateContentType(
  request: Request,
  expectedType = "application/json",
): NextResponse<ErrorResponse> | null {
  const contentType = request.headers.get("content-type");

  if (!contentType?.includes(expectedType)) {
    return jsonError(
      400,
      "INVALID_CONTENT_TYPE",
      `Content-Type must be ${expectedType}`,
    );
  }

  return null;
}

/**
 * Safely parses JSON request body with error handling
 *
 * @param request - Request object
 * @returns Parsed JSON data or error response
 */
export async function parseJsonBody<T = any>(
  request: Request,
): Promise<{ data: T } | NextResponse<ErrorResponse>> {
  try {
    const data = await request.json();
    return { data };
  } catch (error) {
    return jsonError(400, "INVALID_JSON", "Invalid JSON in request body");
  }
}

/**
 * HTTP status codes for consistent usage
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Common error codes for consistent usage
 */
export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
  INVALID_JSON: "INVALID_JSON",
  INVALID_CONTENT_TYPE: "INVALID_CONTENT_TYPE",
  CONSENT_REQUIRED: "CONSENT_REQUIRED",
  PRIVACY_BUDGET_EXCEEDED: "PRIVACY_BUDGET_EXCEEDED",
  INVALID_EPSILON: "INVALID_EPSILON",
} as const;
