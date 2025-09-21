import React from "react";

// Simple SVG icon components
const AlertTriangleIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
    />
  </svg>
);

const XCircleIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const InfoIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const AlertCircleIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: string | object;
  reason?: string;
}

interface ErrorDisplayProps {
  /** Error object or error message string */
  error: ErrorResponse | Error | string | null | undefined;
  /** Additional CSS classes */
  className?: string;
  /** Show detailed technical information */
  showDetails?: boolean;
  /** Variant of the error display */
  variant?: "default" | "compact" | "inline";
}

/**
 * Reusable component for displaying user-facing error messages with reasons
 *
 * Features:
 * - Displays user-friendly "reason" text when available
 * - Falls back to technical error message
 * - Shows appropriate icons based on error type
 * - Supports different display variants
 * - Can show/hide technical details
 */
export function ErrorDisplay({
  error,
  className = "",
  showDetails = false,
  variant = "default",
}: ErrorDisplayProps) {
  if (!error) {
    return null;
  }

  // Parse error into consistent format
  let errorData: {
    message: string;
    reason?: string;
    code?: string;
    status?: number;
    details?: string | object;
  };

  if (typeof error === "string") {
    errorData = { message: error };
  } else if (error instanceof Error) {
    errorData = {
      message: error.message,
      // Check if it's an HttpError with additional properties
      ...("code" in error && { code: error.code as string }),
      ...("reason" in error && { reason: error.reason as string }),
      ...("status" in error && { status: error.status as number }),
    };
  } else {
    // ErrorResponse object
    errorData = {
      message: error.error,
      reason: error.reason,
      code: error.code,
      details: error.details,
    };
  }

  // Determine icon based on error code/status
  const getIcon = () => {
    const status = errorData.status;
    const code = errorData.code;

    if (
      status === 401 ||
      code?.includes("UNAUTHORIZED") ||
      code?.includes("SESSION")
    ) {
      return <XCircleIcon className="h-5 w-5 text-red-500" />;
    }
    if (
      status === 403 ||
      code?.includes("FORBIDDEN") ||
      code?.includes("CONSENT")
    ) {
      return <AlertTriangleIcon className="h-5 w-5 text-orange-500" />;
    }
    if (status === 422 || code?.includes("VALIDATION")) {
      return <InfoIcon className="h-5 w-5 text-blue-500" />;
    }

    return <AlertCircleIcon className="h-5 w-5 text-red-500" />;
  };

  // Get display message (prioritize reason over technical message)
  const displayMessage = errorData.reason || errorData.message;
  const hasReason = !!errorData.reason;

  if (variant === "inline") {
    return (
      <span className={`text-red-600 text-sm ${className}`}>
        {displayMessage}
      </span>
    );
  }

  if (variant === "compact") {
    return (
      <div
        className={`flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md ${className}`}
      >
        {getIcon()}
        <span className="text-sm text-red-800">{displayMessage}</span>
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          {/* Main error message */}
          <h3 className="text-sm font-medium text-red-800 mb-1">
            {hasReason ? "Why did this happen?" : "Error"}
          </h3>

          <p className="text-sm text-red-700 mb-3">{displayMessage}</p>

          {/* Show technical details if requested and different from reason */}
          {showDetails &&
            hasReason &&
            errorData.message !== errorData.reason && (
              <div className="mt-3 pt-3 border-t border-red-200">
                <h4 className="text-xs font-medium text-red-600 mb-1">
                  Technical Details
                </h4>
                <p className="text-xs text-red-600 font-mono">
                  {errorData.code && `[${errorData.code}] `}
                  {errorData.message}
                </p>
                {errorData.details && (
                  <pre className="text-xs text-red-600 mt-1 overflow-auto">
                    {typeof errorData.details === "string"
                      ? errorData.details
                      : JSON.stringify(errorData.details, null, 2)}
                  </pre>
                )}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to extract user-friendly error message from various error types
 */
export function useErrorMessage(error: unknown): string | null {
  if (!error) {
    return null;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    if ("reason" in error && typeof error.reason === "string") {
      return error.reason;
    }
    return error.message;
  }

  // Check if it's an ErrorResponse object
  if (typeof error === "object" && error !== null && "error" in error) {
    const errorObj = error as ErrorResponse;
    return errorObj.reason || errorObj.error;
  }

  return "An unexpected error occurred";
}

/**
 * Component for displaying API response errors specifically
 */
export function ApiErrorDisplay({
  response,
  className = "",
  showDetails = false,
}: {
  response: Response | null;
  className?: string;
  showDetails?: boolean;
}) {
  const [error, setError] = React.useState<ErrorResponse | null>(null);

  React.useEffect(() => {
    if (!response || response.ok) {
      setError(null);
      return;
    }

    response
      .json()
      .then((data: ErrorResponse) => {
        setError(data);
      })
      .catch(() => {
        setError({
          success: false,
          error: `HTTP ${response.status} ${response.statusText}`,
          code: `HTTP_${response.status}`,
          reason:
            response.status === 401
              ? "Please log in to access this resource"
              : response.status === 403
                ? "You do not have permission to perform this action"
                : response.status === 404
                  ? "The requested resource could not be found"
                  : "Something went wrong with your request",
        });
      });
  }, [response]);

  if (!error) {
    return null;
  }

  return (
    <ErrorDisplay
      error={error}
      className={className}
      showDetails={showDetails}
    />
  );
}
