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

// Normalizes thrown errors into a standard API response payload.
export function normalizeError(error) {
  if (!error) {
    return {
      message: "Unexpected error",
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

  if (error.status) {
    return {
      message: error.message || "Something went wrong",
      status: error.status,
      errors: error.errors || null,
    };
  }

  return {
    message: error.message || "Something went wrong",
    status: error.status || 500,
    errors: error.errors || null,
  };
}
