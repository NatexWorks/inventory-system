"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MdAdd,
  MdAttachMoney,
  MdChevronLeft,
  MdChevronRight,
  MdDelete,
  MdEdit,
  MdFilterAlt,
  MdInventory,
  MdMoreHoriz,
  MdOutlineQrCodeScanner,
  MdSearch,
  MdClose,
  MdWarningAmber,
} from "react-icons/md";
import BarcodeCameraScanner from "../components/BarcodeCameraScanner";
import { fetchProducts } from "../components/productFetch";

// INR formatter used for prices and inventory totals on this page.
const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

// Default pagination state before the API sends the real values.
const defaultPagination = {
  page: 1,
  limit: 10,
  totalProducts: 0,
  totalPages: 1,
};

// Formats numeric values as currency for the table and summary cards.
function formatCurrency(value) {
  return money.format(Number(value || 0));
}

// Translates stock count into a human-readable availability label.
function getStatus(stock) {
  if (stock <= 0) {
    return {
      label: "Out of Stock",
      className: "bg-rose-50 text-rose-600 ring-1 ring-rose-100",
    };
  }

  if (stock <= 5) {
    return {
      label: "Low Stock",
      className: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
    };
  }

  return {
    label: "In Stock",
    className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  };
}

// Builds the page-number buttons for the bottom pagination control.
function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) items.push("...");

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (end < totalPages - 1) items.push("...");
  items.push(totalPages);

  return items;
}

// Small stat tile used in the header summary.
function StatCard({ title, value, helper, icon, accent }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-[0_16px_35px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{helper}</p>
        </div>
        <div className={`rounded-2xl p-3 ${accent}`}>{icon}</div>
      </div>
    </div>
  );
}

function buildBarcodeDrafts(product) {
  const stockCount = Math.max(0, Number(product?.stock || 0));
  const existingCodes = Array.isArray(product?.barcodes)
    ? product.barcodes.map((item) => String(item?.code || "").trim()).filter(Boolean)
    : [];

  return Array.from({ length: stockCount }, (_, index) => existingCodes[index] || "");
}

export default function ProductsPage() {
  // This screen manages search, pagination, and delete actions for products.
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return new URLSearchParams(window.location.search).get("search") || "";
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState(defaultPagination);
  const [barcodeTarget, setBarcodeTarget] = useState(null);
  const [barcodeMessage, setBarcodeMessage] = useState("");
  const [barcodeScannerStatus, setBarcodeScannerStatus] = useState("Camera scanner ready");
  const [barcodeScanning, setBarcodeScanning] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeEditorTarget, setBarcodeEditorTarget] = useState(null);
  const [barcodeDrafts, setBarcodeDrafts] = useState([]);
  const [barcodeEditorError, setBarcodeEditorError] = useState("");
  const [barcodeEditorSaving, setBarcodeEditorSaving] = useState(false);

  useEffect(() => {
    function handlePopState() {
      const urlSearch = new URLSearchParams(window.location.search).get("search") || "";
      setSearch(urlSearch);
      setPage(1);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Refetch products whenever the page number or search query changes.
  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        setLoading(true);
        setError("");
        const data = await fetchProducts({ page, search });

        if (!active) {
          return;
        }

        setProducts(data.products ?? []);
        setPagination(data.pagination ?? defaultPagination);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(err.message || "Failed to load products");
        setProducts([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      active = false;
    };
  }, [page, search]);

  const stats = useMemo(() => {
    // Derived metrics are computed from the current product list.
    const totalProducts = pagination.totalProducts ?? products.length;
    const lowStock = products.filter((product) => product.stock > 0 && product.stock <= 5).length;
    const outOfStock = products.filter((product) => product.stock <= 0).length;
    const inventoryValue = products.reduce(
      (sum, product) => sum + Number(product.price || 0) * Number(product.stock || 0),
      0
    );

    return [
      {
        title: "Total Products",
        value: totalProducts,
        helper: "All products in your catalog",
        icon: <MdInventory className="text-2xl text-indigo-600" />,
        accent: "bg-indigo-50",
      },
      {
        title: "Low Stock",
        value: lowStock,
        helper: "Needs attention soon",
        icon: <MdWarningAmber className="text-2xl text-amber-600" />,
        accent: "bg-amber-50",
      },
      {
        title: "Out of Stock",
        value: outOfStock,
        helper: "Unavailable for sale",
        icon: <MdMoreHoriz className="text-2xl text-rose-600" />,
        accent: "bg-rose-50",
      },
      {
        title: "Inventory Value",
        value: formatCurrency(inventoryValue),
        helper: "Current page estimate",
        icon: <MdAttachMoney className="text-2xl text-emerald-600" />,
        accent: "bg-emerald-50",
      },
    ];
  }, [pagination.totalProducts, products]);

  const visibleStart = pagination.totalProducts === 0 ? 0 : (page - 1) * pagination.limit + 1;
  const visibleEnd = visibleStart + products.length - 1;
  const paginationItems = getPaginationItems(page, pagination.totalPages || 1);

  const handleDelete = async (id) => {
    // Remove the product from the backend and then from local state.
    try {
      const response = await fetch(`/api/product/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete product");
      }

      setProducts((prevProducts) => prevProducts.filter((product) => product._id !== id));

      if (products.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      }
    } catch (err) {
      setError(err.message || "Error deleting product");
    }
  };

  const handleSearchChange = (value) => {
    // Searching always resets back to page 1.
    setSearch(value);
    setPage(1);
    const nextSearch = value.trim();
    router.replace(nextSearch ? `/products?search=${encodeURIComponent(nextSearch)}` : "/products");
  };

  const handleFilterReset = () => {
    // Resetting search is just clearing the query and returning to page 1.
    setSearch("");
    setPage(1);
    router.replace("/products");
  };

  const closeBarcodeScanner = () => {
    setBarcodeTarget(null);
    setBarcodeMessage("");
    setBarcodeScannerStatus("Camera scanner ready");
    setBarcodeScanning(false);
    setBarcodeInput("");
  };

  const closeBarcodeEditor = () => {
    setBarcodeEditorTarget(null);
    setBarcodeDrafts([]);
    setBarcodeEditorError("");
    setBarcodeEditorSaving(false);
  };

  const openBarcodeEditor = (product) => {
    setBarcodeEditorTarget(product);
    setBarcodeDrafts(buildBarcodeDrafts(product));
    setBarcodeEditorError("");
    setBarcodeEditorSaving(false);
  };

  const updateBarcodeDraft = (index, value) => {
    setBarcodeDrafts((current) => current.map((entry, entryIndex) => (entryIndex === index ? value : entry)));
  };

  async function saveBarcodeAssignments() {
    if (!barcodeEditorTarget) {
      return;
    }

    const stockCount = Math.max(0, Number(barcodeEditorTarget.stock || 0));
    const normalizedBarcodes = [];
    const seen = new Set();

    for (const entry of barcodeDrafts) {
      const code = String(entry || "").trim();
      if (!code) {
        continue;
      }

      if (seen.has(code)) {
        setBarcodeEditorError(`Barcode ${code} is entered more than once.`);
        return;
      }

      seen.add(code);
      normalizedBarcodes.push({ code, state: "AVAILABLE" });
    }

    if (stockCount > 0 && normalizedBarcodes.length > stockCount) {
      setBarcodeEditorError("Barcode count cannot be greater than stock quantity.");
      return;
    }

    try {
      setBarcodeEditorSaving(true);
      setBarcodeEditorError("");

      const response = await fetch(`/api/product/${barcodeEditorTarget._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          barcodes: normalizedBarcodes,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "Failed to save barcodes");
      }

      const updatedProduct = payload?.data?.product;
      if (updatedProduct) {
        setProducts((current) =>
          current.map((product) => (String(product._id) === String(updatedProduct._id) ? updatedProduct : product))
        );
      }

      closeBarcodeEditor();
    } catch (err) {
      setBarcodeEditorError(err.message || "Failed to save barcodes");
    } finally {
      setBarcodeEditorSaving(false);
    }
  }

  async function handleProductBarcodeScan(code) {
    if (!barcodeTarget) {
      return;
    }

    const normalizedCode = String(code || "").trim();
    if (!normalizedCode) {
      setBarcodeMessage("Please scan or type a barcode first.");
      return;
    }

    try {
      setBarcodeScanning(true);
      setBarcodeInput(normalizedCode);
      setBarcodeMessage("");

      const response = await fetch("/api/barcodes/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ barcode: normalizedCode }),
      });
      const data = await response.json();

      if (!response.ok || !data?.data?.product) {
        throw new Error(data?.message || "Barcode not found");
      }

      const scannedProduct = data.data.product;
      if (String(scannedProduct._id) !== String(barcodeTarget._id)) {
        setBarcodeMessage(`Scanned barcode belongs to ${scannedProduct.name}, not ${barcodeTarget.name}.`);
        return;
      }

      setBarcodeMessage(`Verified ${barcodeTarget.name}: ${normalizedCode}`);
    } catch (err) {
      setBarcodeMessage(err.message || "Barcode scan failed");
    } finally {
      setBarcodeScanning(false);
    }
  }

  const openBarcodeScanner = (product) => {
    setBarcodeTarget(product);
    setBarcodeMessage("");
    setBarcodeScannerStatus("Camera scanner ready");
    setBarcodeInput("");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.14),transparent_30%),linear-gradient(180deg,#eff4ff_0%,#f8fbff_45%,#eef2ff_100%)] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[28px] border border-white/70 bg-white/80 px-5 py-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-500">
                Products
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">Products List</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Manage your products, stock levels, pricing, and availability from one clean view.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <div className="flex w-full min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <MdSearch className="text-xl text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search products..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />
              </div>

              <button
                type="button"
                onClick={handleFilterReset}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              >
                <MdFilterAlt className="text-lg" />
                Reset
              </button>

              <Link
                href="/addProducts"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:scale-[1.01] hover:from-indigo-500 hover:to-violet-500"
              >
                <MdAdd className="text-lg" />
                Add Product
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </section>

        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <section className="rounded-[28px] border border-white/70 bg-white/90 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">All Products</h2>
              <p className="text-sm text-slate-500">Manage catalog entries and stock status.</p>
            </div>
            <div className="hidden rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-500 md:block">
              {pagination.totalProducts > 0
                ? `Showing ${visibleStart} to ${visibleEnd} of ${pagination.totalProducts} results`
                : "No products found"}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }, (_, index) => (
                <div
                  key={index}
                  className="h-16 animate-pulse rounded-2xl bg-slate-100"
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="rounded-3xl bg-indigo-50 p-4 text-indigo-600">
                <MdInventory className="text-3xl" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-slate-900">No products yet</h3>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                Try another search term or add your first product to start populating the list.
              </p>
              <Link
                href="/addProducts"
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                <MdAdd className="text-lg" />
                Add Product
              </Link>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-400">
                      <th className="px-5 py-4 font-semibold">Product</th>
                      <th className="px-5 py-4 font-semibold">Category</th>
                      <th className="px-5 py-4 font-semibold">Price</th>
                      <th className="px-5 py-4 font-semibold">Stock</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                      <th className="px-5 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => {
                      const status = getStatus(Number(product.stock || 0));

                      return (
                        <tr
                          key={product._id}
                          className="group border-t border-slate-100 transition hover:bg-slate-50/80"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-4">
                              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-slate-900 to-slate-700 text-sm font-bold text-white">
                                {(product.name || "P").charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900">{product.name}</p>
                                <p className="mt-1 text-sm text-slate-500">SKU: {product.sku}</p>
                                <p className="mt-1 text-xs text-slate-400">
                                  Barcodes: {Array.isArray(product.barcodes) ? product.barcodes.length : 0}/{Number(product.stock || 0)}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
                              {product.category || "Uncategorized"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                            {formatCurrency(product.price)}
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-700">
                            {Number(product.stock || 0)}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openBarcodeEditor(product)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-600 transition hover:bg-emerald-50"
                                aria-label={`Add barcodes for ${product.name}`}
                              >
                                <MdAdd className="text-lg" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openBarcodeScanner(product)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-indigo-200 bg-white text-indigo-600 transition hover:bg-indigo-50"
                                aria-label={`Scan barcode for ${product.name}`}
                              >
                                <MdOutlineQrCodeScanner className="text-lg" />
                              </button>
                              <button
                                type="button"
                                onClick={() => router.push(`/addProducts?id=${product._id}`)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                                aria-label={`Edit ${product.name}`}
                              >
                                <MdEdit className="text-lg" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(product._id)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-500 transition hover:bg-rose-50"
                                aria-label={`Delete ${product.name}`}
                              >
                                <MdDelete className="text-lg" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 p-4 md:hidden">
                {products.map((product) => {
                  const status = getStatus(Number(product.stock || 0));

                  return (
                    <article
                      key={product._id}
                      className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-bold text-white">
                            {(product.name || "P").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{product.name}</p>
                            <p className="text-xs text-slate-500">{product.sku}</p>
                            <p className="mt-1 text-[11px] text-slate-400">
                              Barcodes: {Array.isArray(product.barcodes) ? product.barcodes.length : 0}/{Number(product.stock || 0)}
                            </p>
                          </div>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
                          {status.label}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-2xl bg-white p-3">
                          <p className="text-xs text-slate-500">Category</p>
                          <p className="mt-1 font-medium text-slate-900">{product.category || "Uncategorized"}</p>
                        </div>
                        <div className="rounded-2xl bg-white p-3">
                          <p className="text-xs text-slate-500">Price</p>
                          <p className="mt-1 font-medium text-slate-900">{formatCurrency(product.price)}</p>
                        </div>
                        <div className="rounded-2xl bg-white p-3">
                          <p className="text-xs text-slate-500">Stock</p>
                          <p className="mt-1 font-medium text-slate-900">{Number(product.stock || 0)}</p>
                        </div>
                        <div className="rounded-2xl bg-white p-3">
                          <p className="text-xs text-slate-500">Cost Price</p>
                          <p className="mt-1 font-medium text-slate-900">{formatCurrency(product.costPrice)}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openBarcodeEditor(product)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-600"
                        >
                          <MdAdd />
                          Barcodes
                        </button>
                        <button
                          type="button"
                          onClick={() => openBarcodeScanner(product)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-600"
                        >
                          <MdOutlineQrCodeScanner />
                          Scan
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(`/addProducts?id=${product._id}`)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                        >
                          <MdEdit />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(product._id)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600"
                        >
                          <MdDelete />
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="flex flex-col gap-4 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  {pagination.totalProducts > 0
                    ? `Showing ${visibleStart} to ${visibleEnd} of ${pagination.totalProducts} results`
                    : "No products found"}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page <= 1}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <MdChevronLeft className="text-xl" />
                  </button>

                  {paginationItems.map((item, index) =>
                    item === "..." ? (
                      <span key={`ellipsis-${index}`} className="px-2 text-sm text-slate-400">
                        ...
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setPage(item)}
                        className={`min-w-10 rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                          item === page
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    onClick={() => setPage((current) => current + 1)}
                    disabled={page >= pagination.totalPages}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <MdChevronRight className="text-xl" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {barcodeTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/20 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-500">Barcode Scan</p>
                <h3 className="mt-2 text-xl font-bold text-slate-900">{barcodeTarget.name}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Stock {Number(barcodeTarget.stock || 0)} | Assigned barcodes {Array.isArray(barcodeTarget.barcodes) ? barcodeTarget.barcodes.length : 0}
                </p>
              </div>
              <button
                type="button"
                onClick={closeBarcodeScanner}
                className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50"
                aria-label="Close barcode scanner"
              >
                <MdClose className="text-lg" />
              </button>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-[1.1fr_0.9fr]">
              <BarcodeCameraScanner
                onScan={handleProductBarcodeScan}
                onStatus={setBarcodeScannerStatus}
                className="border border-slate-200"
              />

              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Manual barcode check</p>
                  <p className="mt-1 text-xs text-slate-500">Type or paste a barcode to verify it against this product.</p>
                  <div className="mt-3 flex gap-3">
                    <input
                      value={barcodeInput}
                      onChange={(event) => setBarcodeInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleProductBarcodeScan(barcodeInput);
                        }
                      }}
                      placeholder="Enter barcode code"
                      className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-indigo-300"
                    />
                    <button
                      type="button"
                      onClick={() => handleProductBarcodeScan(barcodeInput)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200"
                    >
                      <MdOutlineQrCodeScanner className="text-lg" />
                      Verify
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    {barcodeScanning ? "Scanning..." : barcodeMessage || "Scan barcodes one by one to verify assignments."}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    Scanner status: {barcodeScannerStatus}
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">Saved barcodes</p>
                  <div className="mt-3 max-h-64 space-y-2 overflow-auto pr-1">
                    {Array.isArray(barcodeTarget.barcodes) && barcodeTarget.barcodes.length > 0 ? (
                      barcodeTarget.barcodes.map((item, index) => (
                        <div key={`${item.code}-${index}`} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                          {item.code}
                          <span className="ml-2 text-xs text-slate-400">({item.state || "AVAILABLE"})</span>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                        No barcodes are assigned to this product yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {barcodeEditorTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/20 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-500">Add Barcodes</p>
                <h3 className="mt-2 text-xl font-bold text-slate-900">{barcodeEditorTarget.name}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Stock {Number(barcodeEditorTarget.stock || 0)} | Existing barcodes {Array.isArray(barcodeEditorTarget.barcodes) ? barcodeEditorTarget.barcodes.length : 0}
                </p>
              </div>
              <button
                type="button"
                onClick={closeBarcodeEditor}
                className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50"
                aria-label="Close barcode editor"
              >
                <MdClose className="text-lg" />
              </button>
            </div>

            <div className="p-5">
              <div className="rounded-3xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                Optional: fill any barcode slots you want to assign. Leave the rest blank if you do not want to save barcodes now.
              </div>

              {barcodeDrafts.length > 0 ? (
                <div className="mt-4 max-h-[55vh] space-y-3 overflow-auto pr-1">
                  {barcodeDrafts.map((draft, index) => (
                    <div
                      key={`barcode-draft-${index}`}
                      className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[120px_minmax(0,1fr)] md:items-center"
                    >
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Slot {index + 1}</p>
                        <p className="mt-1 text-sm text-slate-500">For stock item {index + 1}</p>
                      </div>
                      <input
                        value={draft}
                        onChange={(event) => updateBarcodeDraft(index, event.target.value)}
                        placeholder={`Barcode ${index + 1}`}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-emerald-300"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  This product has 0 stock, so there are no barcode slots to fill right now.
                </div>
              )}

              {barcodeEditorError ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {barcodeEditorError}
                </div>
              ) : null}

              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={closeBarcodeEditor}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveBarcodeAssignments}
                  disabled={barcodeEditorSaving}
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {barcodeEditorSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
