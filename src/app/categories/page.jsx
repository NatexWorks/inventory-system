"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MdAdd, MdCategory, MdDelete, MdEdit, MdInventory, MdSearch, MdTrendingUp } from "react-icons/md";
import { createCategory, fetchCategories, removeCategory, updateCategory } from "../components/productFetch";

// Formats category totals as INR for the summary cards and stats blocks.
function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

// Single category card with edit and delete actions.
function CategoryCard({ category, productCount, stock, onEdit, onDelete, deleting }) {
  const canDelete = productCount === 0;

  return (
    <article className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-500">Category</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{category.name}</h3>
          <p className="mt-1 text-sm text-slate-500">{category.description || "No description yet"}</p>
        </div>
        <div className="rounded-2xl bg-indigo-50 p-2.5 text-indigo-600">
          <MdCategory className="text-xl" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-slate-50 p-2.5">
          <p className="text-xs text-slate-500">Products</p>
          <p className="mt-1 text-base font-semibold text-slate-900">{productCount}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-2.5">
          <p className="text-xs text-slate-500">Stock</p>
          <p className="mt-1 text-base font-semibold text-slate-900">{stock}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500">{canDelete ? "Safe to delete" : "Has linked products"}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(category)}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            <MdEdit />
            Edit
          </button>
          <button
            type="button"
            disabled={!canDelete || deleting}
            onClick={() => onDelete(category)}
            className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MdDelete />
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

export default function CategoriesPage() {
  // Categories, counts, and form state all live on this screen.
  const [categories, setCategories] = useState([]);
  const [productCounts, setProductCounts] = useState([]);
  const [search, setSearch] = useState("");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", description: "" });
  const [editingId, setEditingId] = useState("");

  // Shared loader used by both initial fetches and post-save refreshes.
  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchCategories();
      setCategories(data.categories || []);
      setProductCounts(data.productCounts || []);
    } catch (err) {
      setError(err.message || "Failed to load categories");
      setCategories([]);
      setProductCounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    // Kick off the first load once the page mounts.
    (async () => {
      try {
        if (active) {
          await load();
        }
      } catch {
        // load() already records the error state.
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const countByCategory = useMemo(() => {
    // Turn the raw product count array into quick lookup data.
    return new Map((productCounts || []).map((item) => [String(item._id), item]));
  }, [productCounts]);

  const visibleCategories = useMemo(() => {
    // Search is applied locally so filtering stays instant.
    const term = search.trim().toLowerCase();
    return [...categories]
      .filter((category) => {
        if (!term) return true;
        return `${category.name} ${category.description || ""}`.toLowerCase().includes(term);
      })
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  }, [categories, search]);

  const displayedCategories = useMemo(() => {
    if (showAllCategories || visibleCategories.length <= 4) {
      return visibleCategories;
    }

    return visibleCategories.slice(0, 4);
  }, [showAllCategories, visibleCategories]);

  const totals = useMemo(() => {
    // All the top summary values are derived from the loaded lists.
    const totalCategories = categories.length;
    const totalProducts = productCounts.reduce((sum, item) => sum + Number(item.count || 0), 0);
    const totalStock = productCounts.reduce((sum, item) => sum + Number(item.stock || 0), 0);
    const leadingCategory = [...categories]
      .map((category) => ({
        category,
        count: Number(countByCategory.get(String(category._id))?.count || 0),
      }))
      .sort((a, b) => b.count - a.count)[0];

    return {
      totalCategories,
      totalProducts,
      totalStock,
      leadingCategory: leadingCategory?.category?.name || "N/A",
      leadingCount: leadingCategory?.count || 0,
    };
  }, [categories, countByCategory, productCounts]);

  function resetForm() {
    // Clear the form and exit edit mode.
    setForm({ name: "", description: "" });
    setEditingId("");
  }

  function beginEdit(category) {
    // Load the selected category into the form for editing.
    setEditingId(category._id);
    setForm({
      name: category.name || "",
      description: category.description || "",
    });
  }

  async function handleSubmit(event) {
    // Create or update based on whether an edit id is present.
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (editingId) {
        await updateCategory(editingId, form);
        setMessage("Category updated successfully");
      } else {
        await createCategory(form);
        setMessage("Category created successfully");
      }

      resetForm();
      await load();
    } catch (err) {
      setError(err.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(category) {
    // Deletion is guarded by a confirmation dialog and backend checks.
    const confirmed = window.confirm(`Delete ${category.name}? This only works when no products are linked to it.`);
    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(category._id);
      setError("");
      setMessage("");
      await removeCategory(category._id);
      setMessage("Category deleted successfully");
      await load();
    } catch (err) {
      setError(err.message || "Failed to delete category");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.14),_transparent_30%),linear-gradient(180deg,#eff4ff_0%,#f8fbff_45%,#eef2ff_100%)] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[28px] border border-white/70 bg-white/80 px-5 py-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-500">Categories</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">Category Overview</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Create, update, and safely delete categories without breaking product links.
              </p>
            </div>

            <div className="flex w-full min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:w-auto">
              <MdSearch className="text-xl text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search categories..."
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-[0_16px_35px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-sm font-medium text-slate-500">Total Categories</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{totals.totalCategories}</p>
            <p className="mt-1 text-xs text-slate-500">Unique product groups</p>
          </div>
          <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-[0_16px_35px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-sm font-medium text-slate-500">Total Products</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{totals.totalProducts}</p>
            <p className="mt-1 text-xs text-slate-500">Across all categories</p>
          </div>
          <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-[0_16px_35px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-sm font-medium text-slate-500">Total Stock</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{totals.totalStock}</p>
            <p className="mt-1 text-xs text-slate-500">Units tied to categories</p>
          </div>
          <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-[0_16px_35px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-sm font-medium text-slate-500">Top Category</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{totals.leadingCategory}</p>
            <p className="mt-1 text-xs text-slate-500">{totals.leadingCount} products</p>
          </div>
        </section>

        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div>
        ) : null}
        {message ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{editingId ? "Edit Category" : "Create Category"}</h2>
                <p className="text-sm text-slate-500">Categories update the product dropdown automatically.</p>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              >
                Reset
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Category Name</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:bg-white"
                  placeholder="Enter category name"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
                  className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:bg-white"
                  placeholder="Optional category description"
                />
              </label>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <MdAdd />
                {saving ? "Saving..." : editingId ? "Update Category" : "Create Category"}
              </button>
            </form>
          </div>

          <div className="rounded-[28px] border border-white/70 bg-white/90 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Category List</h2>
                <p className="text-sm text-slate-500">Shows product counts and stock usage.</p>
              </div>
              <div className="hidden items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-500 md:flex">
                <MdTrendingUp className="text-lg text-indigo-500" />
                Auto refresh enabled
              </div>
            </div>

            {loading ? (
              <div className="grid gap-4 p-5 md:grid-cols-2">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="h-40 animate-pulse rounded-3xl bg-slate-100" />
                ))}
              </div>
            ) : visibleCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="rounded-3xl bg-indigo-50 p-4 text-indigo-600">
                  <MdCategory className="text-3xl" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-slate-900">No categories found</h3>
                <p className="mt-2 max-w-md text-sm text-slate-500">
                  Create a category to make the product dropdown and reports more useful.
                </p>
                <Link
                  href="/addProducts"
                  className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
                >
                  <MdInventory className="text-lg" />
                  Add Product
                </Link>
              </div>
            ) : (
              <div className="p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  {displayedCategories.map((category) => {
                    const stats = countByCategory.get(String(category._id)) || {};
                    return (
                      <CategoryCard
                        key={category._id}
                        category={category}
                        productCount={Number(stats.count || 0)}
                        stock={Number(stats.stock || 0)}
                        onEdit={beginEdit}
                        onDelete={handleDelete}
                        deleting={Boolean(deletingId)}
                      />
                    );
                  })}
                </div>

                {visibleCategories.length > 4 ? (
                  <div className="mt-4 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowAllCategories((current) => !current)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      {showAllCategories ? "View less" : "View all"}
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
