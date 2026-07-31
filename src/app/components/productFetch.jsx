"use client";

// Small API wrapper for products so page components do not repeat fetch logic.
export async function fetchProducts({ page = 1, search = "" } = {}) {
  const res = await fetch(`/api/product?page=${page}&search=${search}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    let message = "Failed to fetch products";
    try {
      const payload = await res.json();
      message = payload?.message || message;
    } catch {
      // Keep fallback message.
    }
    throw new Error(message);
  }

  const payload = await res.json();
  if (payload?.data) {
    return payload.data;
  }

  return payload;
}

// Fetches categories and the product counts used by category screens.
export async function fetchCategories() {
  const res = await fetch("/api/category", {
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    let message = "Failed to fetch categories";
    try {
      const payload = await res.json();
      message = payload?.message || message;
    } catch {
      // Keep fallback message.
    }
    throw new Error(message);
  }

  const payload = await res.json();
  return payload?.data || { categories: [], productCounts: [] };
}

// Creates a category through the backend API.
export async function createCategory(input) {
  const res = await fetch("/api/category", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload?.message || "Failed to create category");
  }

  return payload?.data?.category || null;
}

// Updates an existing category by id.
export async function updateCategory(id, input) {
  const res = await fetch(`/api/category/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload?.message || "Failed to update category");
  }

  return payload?.data?.category || null;
}

// Removes a category by id.
export async function removeCategory(id) {
  const res = await fetch(`/api/category/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload?.message || "Failed to delete category");
  }

  return payload?.data?.deletedCount || 0;
}
