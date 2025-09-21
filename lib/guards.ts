import { prisma } from "./db";
import { verifyConsentToken, ConsentTokenError } from "./jwt";
import { getSession } from "./session";
import type { User, ApiClient, ConsentPolicy } from "@prisma/client";

// Type definitions
export interface AuthenticatedUser {
  id: string;
  email: string;
}

export interface ConsentCheckParams {
  userId: string;
  categories: string[];
  purpose: string;
  scopes: string[];
}

export interface HttpErrorResponse {
  error: string;
  code: string;
  status: number;
  reason?: string; // User-facing explanation of why the error occurred
}

// HTTP Error Classes
export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public reason?: string, // User-facing explanation
  ) {
    super(message);
    this.name = "HttpError";
  }

  toJSON(): HttpErrorResponse {
    return {
      error: this.message,
      code: this.code,
      status: this.status,
      ...(this.reason && { reason: this.reason }),
    };
  }
}

export class UnauthorizedError extends HttpError {
  constructor(
    message: string = "Unauthorized",
    code: string = "UNAUTHORIZED",
    reason?: string,
  ) {
    super(message, 401, code, reason);
  }
}

export class ForbiddenError extends HttpError {
  constructor(
    message: string = "Forbidden",
    code: string = "FORBIDDEN",
    reason?: string,
  ) {
    super(message, 403, code, reason);
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string = "Not Found", code: string = "NOT_FOUND") {
    super(message, 404, code);
  }
}

/**
 * Requires a valid user session or throws 401 Unauthorized
 *
 * @returns Promise<AuthenticatedUser> - The authenticated user
 * @throws UnauthorizedError if no valid session exists
 *
 * @example
 * ```typescript
 * // In an API route or server action
 * const user = await requireSession();
 * console.log(`User ${user.email} is authenticated`);
 * ```
 */
export async function requireSession(): Promise<AuthenticatedUser> {
  const session = await getSession();

  if (!session?.userId || !session?.email) {
    throw new UnauthorizedError(
      "Valid session required",
      "SESSION_REQUIRED",
      "Please log in to access this resource",
    );
  }

  return {
    id: session.userId,
    email: session.email,
  };
}

/**
 * Requires a valid API key in the x-api-key header or throws 401 Unauthorized
 *
 * @param req - The incoming Request object
 * @returns Promise<ApiClient> - The authenticated API client
 * @throws UnauthorizedError if API key is missing or invalid
 *
 * @example
 * ```typescript
 * // In an API route
 * export async function GET(req: Request) {
 *   const apiClient = await requireApiClient(req);
 *   console.log(`API request from ${apiClient.name}`);
 * }
 * ```
 */
export async function requireApiClient(req: Request): Promise<ApiClient> {
  const apiKey = req.headers.get("x-api-key");

  if (!apiKey) {
    throw new UnauthorizedError(
      "API key required",
      "API_KEY_REQUIRED",
      "Please provide a valid API key in the x-api-key header",
    );
  }

  try {
    const apiClient = await prisma.apiClient.findUnique({
      where: { apiKey },
    });

    if (!apiClient) {
      throw new UnauthorizedError(
        "Invalid API key",
        "INVALID_API_KEY",
        "The provided API key is not recognized or has been revoked",
      );
    }

    return apiClient;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new UnauthorizedError(
      "API key validation failed",
      "API_KEY_VALIDATION_FAILED",
      "Unable to verify API key. Please check your credentials and try again",
    );
  }
}

/**
 * Requires a valid, non-revoked consent token or throws 403 Forbidden
 *
 * @param authHeader - Authorization header value (e.g., "Bearer <token>")
 * @returns Promise<ConsentTokenPayload> - The verified token payload
 * @throws ForbiddenError if token is missing, invalid, expired, or revoked
 *
 * @example
 * ```typescript
 * // In an API route handling data access
 * const authHeader = req.headers.get('authorization');
 * const tokenPayload = await requireConsentToken(authHeader);
 * console.log(`Access granted for purposes: ${tokenPayload.purpose}`);
 * ```
 */
export async function requireConsentToken(authHeader: string | null) {
  if (!authHeader) {
    throw new ForbiddenError(
      "Authorization header required",
      "AUTH_HEADER_REQUIRED",
      "Please provide a consent token in the Authorization header",
    );
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    throw new ForbiddenError(
      "Invalid authorization header format",
      "INVALID_AUTH_FORMAT",
      "Authorization header must be in format: Bearer <token>",
    );
  }

  const token = parts[1];

  try {
    // Verify JWT structure and signature
    const payload = await verifyConsentToken(token);

    // Check if token is revoked in database
    const storedToken = await prisma.consentToken.findFirst({
      where: {
        jwt: token,
        userId: payload.sub,
      },
    });

    if (!storedToken) {
      throw new ForbiddenError(
        "Token not found",
        "TOKEN_NOT_FOUND",
        "This consent token is not recognized or may have been deleted",
      );
    }

    if (storedToken.revoked) {
      throw new ForbiddenError(
        "Token has been revoked",
        "TOKEN_REVOKED",
        "Your consent has been withdrawn. Please provide new consent to access this resource",
      );
    }

    // Double-check expiration against database
    if (storedToken.expiresAt < new Date()) {
      const categories = storedToken.categories.join(", ");
      throw new ForbiddenError(
        "Token has expired",
        "TOKEN_EXPIRED",
        `Consent expired for '${categories}' data under '${storedToken.purpose}' purpose. Please provide new consent to continue`,
      );
    }

    return payload;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    if (error instanceof ConsentTokenError) {
      switch (error.code) {
        case "EXPIRED":
          throw new ForbiddenError(
            "Token has expired",
            "TOKEN_EXPIRED",
            "Your consent token has expired. Please provide new consent to continue",
          );
        case "INVALID":
          throw new ForbiddenError(
            "Invalid token",
            "INVALID_TOKEN",
            "The provided consent token is invalid or corrupted. Please obtain a new consent token",
          );
        case "MALFORMED":
          throw new ForbiddenError(
            "Malformed token",
            "MALFORMED_TOKEN",
            "The consent token format is incorrect. Please check your authorization header",
          );
        case "VERIFICATION_FAILED":
          throw new ForbiddenError(
            "Token verification failed",
            "TOKEN_VERIFICATION_FAILED",
            "Unable to verify consent token signature. Please obtain a new consent token",
          );
        default:
          throw new ForbiddenError(
            "Token validation failed",
            "TOKEN_VALIDATION_FAILED",
            "Unable to validate consent token. Please provide a valid token",
          );
      }
    }

    throw new ForbiddenError(
      "Consent token validation failed",
      "CONSENT_TOKEN_FAILED",
      "Unable to process consent token. Please check your authorization and try again",
    );
  }
}

/**
 * Ensures user has granted consent for the requested data access
 *
 * @param params - Object containing userId, categories, purpose, and scopes
 * @throws ForbiddenError if consent is not granted, restricted, or expired
 *
 * @example
 * ```typescript
 * // Before accessing user's health data
 * await ensureConsentAllowed({
 *   userId: 'user123',
 *   categories: ['health'],
 *   purpose: 'medical-research',
 *   scopes: ['read', 'aggregate']
 * });
 * console.log('Consent verified - proceeding with data access');
 * ```
 */
export async function ensureConsentAllowed(
  params: ConsentCheckParams,
): Promise<void> {
  const { userId, categories, purpose, scopes } = params;

  if (
    !userId ||
    !Array.isArray(categories) ||
    !purpose ||
    !Array.isArray(scopes)
  ) {
    throw new ForbiddenError(
      "Invalid consent check parameters",
      "INVALID_CONSENT_PARAMS",
      "Missing required parameters for consent verification",
    );
  }

  try {
    // Get all relevant consent policies for the user and categories
    const consentPolicies = await prisma.consentPolicy.findMany({
      where: {
        userId,
        category: {
          key: {
            in: categories,
          },
        },
        purpose,
      },
      include: {
        category: true,
      },
    });

    // Check if we have policies for all requested categories
    const policyCategoryKeys = consentPolicies.map((p) => p.category.key);
    const missingCategories = categories.filter(
      (cat) => !policyCategoryKeys.includes(cat),
    );

    if (missingCategories.length > 0) {
      throw new ForbiddenError(
        `No consent policy found for categories: ${missingCategories.join(", ")}`,
        "MISSING_CONSENT_POLICY",
        `You haven't granted consent for '${missingCategories.join(", ")}' data categories under '${purpose}' purpose. Please provide consent first`,
      );
    }

    // Check each policy's status and expiration
    for (const policy of consentPolicies) {
      // Check consent status
      if (policy.status === "REVOKED") {
        throw new ForbiddenError(
          `Consent revoked for category: ${policy.category.name}`,
          "CONSENT_REVOKED",
          `Your consent for '${policy.category.name}' data under '${purpose}' purpose has been revoked. Please provide new consent to access this data`,
        );
      }

      if (policy.status === "RESTRICTED") {
        throw new ForbiddenError(
          `Consent restricted for category: ${policy.category.name}`,
          "CONSENT_RESTRICTED",
          `Access to '${policy.category.name}' data is currently restricted under '${purpose}' purpose. Some operations may not be available`,
        );
      }

      if (policy.status !== "GRANTED") {
        throw new ForbiddenError(
          `Invalid consent status for category: ${policy.category.name}`,
          "INVALID_CONSENT_STATUS",
          `Consent status for '${policy.category.name}' data is not valid. Please review and update your consent preferences`,
        );
      }

      // Check expiration
      if (policy.expiresAt && policy.expiresAt < new Date()) {
        throw new ForbiddenError(
          `Consent expired for category: ${policy.category.name}`,
          "CONSENT_EXPIRED",
          `Your consent for '${policy.category.name}' data under '${purpose}' purpose expired on ${policy.expiresAt.toLocaleDateString()}. Please renew your consent to continue`,
        );
      }

      // Check scopes - all requested scopes must be included in policy scopes
      const missingScopes = scopes.filter(
        (scope) => !policy.scopes.includes(scope),
      );
      if (missingScopes.length > 0) {
        throw new ForbiddenError(
          `Insufficient scopes for category ${policy.category.name}. Missing: ${missingScopes.join(", ")}`,
          "INSUFFICIENT_SCOPES",
          `Your consent for '${policy.category.name}' data doesn't include the required permissions: ${missingScopes.join(", ")}. Please update your consent to grant these permissions`,
        );
      }
    }

    // All checks passed - consent is allowed
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new ForbiddenError(
      "Consent validation failed",
      "CONSENT_VALIDATION_FAILED",
      "Unable to verify your consent permissions. Please check your consent settings and try again",
    );
  }
}

/**
 * Utility function to handle HTTP errors in API routes
 *
 * @param error - The error to handle
 * @returns Response object with appropriate status and JSON body
 *
 * @example
 * ```typescript
 * export async function GET(req: Request) {
 *   try {
 *     const user = await requireSession();
 *     return Response.json({ user });
 *   } catch (error) {
 *     return handleHttpError(error);
 *   }
 * }
 * ```
 */
export function handleHttpError(error: unknown): Response {
  if (error instanceof HttpError) {
    return Response.json(error.toJSON(), { status: error.status });
  }

  // Handle other types of errors
  console.error("Unexpected error:", error);
  return Response.json(
    {
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      status: 500,
    },
    { status: 500 },
  );
}

/**
 * Middleware helper to wrap API route handlers with error handling
 *
 * @param handler - The API route handler function
 * @returns Wrapped handler with automatic error handling
 */
export function withErrorHandling(
  handler: (req: Request, context?: any) => Promise<Response>,
) {
  return async (req: Request, context?: any): Promise<Response> => {
    try {
      return await handler(req, context);
    } catch (error) {
      return handleHttpError(error);
    }
  };
}
