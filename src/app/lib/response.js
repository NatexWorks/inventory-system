// Standard JSON response helpers used by API routes.
import { NextResponse } from "next/server";

// Success responses carry a message, optional data, and optional metadata.
export function success(message, data = null, meta = null, status = 200) {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
      meta,
    },
    { status }
  );
}

// Failure responses carry a message and optional error details.
export function failure(message, errors = null, status = 400) {
  return NextResponse.json(
    {
      success: false,
      message,
      errors,
    },
    { status }
  );
}

// Never expose internal exception messages, credentials, or infrastructure details.
const MAINTENANCE_MESSAGE = "Site under maintenance. Please try again shortly.";

// Normalizes thrown errors into a standard API response payload.
export function normalizeError(error) {
  if (!error) {
    return {
      message: MAINTENANCE_MESSAGE,
      status: 500,
      errors: null,
    };
  }

  if (error.name === "ZodError" || error.name === "ValidationError") {
    const issues = Array.isArray(error.issues) ? error.issues : [];
    return {
      message: "Validation failed",
      status: 400,
      errors: issues.length
        ? issues.map((item) => item.message || "Invalid value")
        : [error.message || "Validation failed"],
    };
  }

  if (error.code === 11000) {
    const duplicateField = Object.keys(error.keyValue || {})[0] || "field";
    return {
      message: `${duplicateField} already exists`,
      status: 409,
      errors: [error.message],
    };
  }

  const status = Number.isInteger(error.status) ? error.status : 500;

  // Expected client errors can keep safe, actionable messages. Server-side failures
  // always receive the same generic response; the original error remains server-side.
  if (status >= 500) {
    return {
      message: MAINTENANCE_MESSAGE,
      status,
      errors: null,
    };
  }

  if (error.status) {
    return {
      message: error.message || "Something went wrong",
      status: error.status,
      errors: error.errors || null,
    };
  }

  return {
    message: "Something went wrong. Please check your request and try again.",
    status: 400,
    errors: error.errors || null,
  };
}
