// Small tenant helpers used to scope queries to the current user.
export function scopeQuery(userId, query = {}) {
  return {
    ...query,
    userId,
  };
}

// Throws when an operation is missing a tenant/user id.
export function assertUserId(userId) {
  if (!userId) {
    throw new Error("userId is required");
  }
}

// Normalizes ids to a simple string form for query construction.
export function toObjectId(id) {
  return String(id);
}
