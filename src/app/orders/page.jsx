"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MdChevronLeft,
  MdChevronRight,
  MdDelete,
  MdLocalShipping,
  MdOutlineCancel,
  MdOutlineDoneAll,
  MdOutlineInventory2,
  MdOutlineQrCodeScanner,
  MdOutlineReceiptLong,
  MdSearch,
  MdSync,
  MdShoppingCart,
  MdWifiOff,
} from "react-icons/md";
import BarcodeCameraScanner from "../components/BarcodeCameraScanner";

// Order status styles keep the badge readable at a glance.
const statusStyles = {
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  PENDING_APPROVAL: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  DRAFT: "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
  CANCELLED: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
};

// Small badge component used in both desktop and mobile order layouts.
function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status] || statusStyles.DRAFT}`}>
      {status}
    </span>
  );
}

// Reusable stat tile for the order summary section.
function StatCard({ title, value, helper, icon: Icon, accent }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-[0_16px_35px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{helper}</p>
        </div>
        <div className={`rounded-2xl p-3 ${accent}`}>
          <Icon className="text-2xl" />
        </div>
      </div>
    </div>
  );
}

// Central currency formatter so order totals stay consistent.
function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

const DRAFT_KEY = "inventory-saas-orders-draft";
const INDIA_TIME_ZONE = "Asia/Kolkata";
const orderDateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: INDIA_TIME_ZONE,
});

function getCartItemKey(item) {
  return item?.barcode ? `barcode:${item.barcode}` : `product:${item.productId}`;
}

// Restores the draft cart from localStorage when the page opens.
function loadDraftCart() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return JSON.parse(window.localStorage.getItem(DRAFT_KEY) || "[]");
  } catch {
    return [];
  }
}

export default function OrdersPage() {
  // This page coordinates live orders, draft checkout state, and barcode input.
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(() => loadDraftCart());
  const [barcode, setBarcode] = useState("");
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [productLoading, setProductLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showAllQuickProducts, setShowAllQuickProducts] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const [scanStatus, setScanStatus] = useState("Camera scanner ready");
  const [isOffline, setIsOffline] = useState(() => (typeof navigator !== "undefined" ? !navigator.onLine : false));

  // Keep the offline flag aligned with browser online/offline events.
  useEffect(() => {
    function handleOnline() {
      setIsOffline(false);
    }

    function handleOffline() {
      setIsOffline(true);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(cart));
  }, [cart]);

  // Load the latest order list when the page mounts.
  useEffect(() => {
    async function loadOrders() {
      try {
        setLoading(true);
        const response = await fetch("/api/orders?limit=20");
        if (!response.ok) {
          throw new Error("Failed to load orders");
        }

        const data = await response.json();
        setOrders(data?.data?.orders || []);
      } catch (err) {
        setError(err.message || "Failed to load orders");
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, []);

  useEffect(() => {
    // Products and settings are both needed for the checkout workflow.
    async function loadProducts() {
      try {
        setProductLoading(true);
        const [productsResponse, settingsResponse] = await Promise.all([
          fetch("/api/product?limit=100"),
          fetch("/api/settings"),
        ]);

        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          setProducts(productsData?.data?.products || []);
        }

        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          setSettings(settingsData?.data?.settings || null);
        }
      } catch {
        setProducts([]);
      } finally {
        setProductLoading(false);
      }
    }

    loadProducts();
  }, []);

  async function refreshOrders() {
    // Refresh the visible orders after checkout, approval, or cancellation.
    const response = await fetch("/api/orders?limit=20");
    if (!response.ok) {
      throw new Error("Failed to load orders");
    }

    const data = await response.json();
    setOrders(data?.data?.orders || []);
  }

  async function refreshProducts() {
    const response = await fetch("/api/product?limit=100");
    if (!response.ok) {
      throw new Error("Failed to load products");
    }

    const data = await response.json();
    setProducts(data?.data?.products || []);
  }

  function getAvailableStock(productId) {
    const product = products.find((item) => String(item._id) === String(productId));
    return Math.max(0, Number(product?.stock ?? 0));
  }

  function upsertCartItem(product, quantityDelta = 1, barcodeInfo = null) {
    // Adds a new item or increases quantity for an existing cart line.
    const availableStock = Math.max(0, Number(product?.stock ?? getAvailableStock(product._id)));
    if (availableStock <= 0) {
      setDraftMessage(`${product.name} is out of stock.`);
      return false;
    }

    const barcodeValue = String(barcodeInfo?.code || "").trim();
    const barcodeIdValue = barcodeInfo?.barcodeId || barcodeInfo?._id || null;

    setCart((current) => {
      const existingIndex = current.findIndex((item) => {
        if (barcodeValue) {
          return item.barcode === barcodeValue;
        }

        return item.productId === product._id && !item.barcode;
      });

      if (existingIndex >= 0) {
        const existingItem = current[existingIndex];
        if (barcodeValue) {
          setDraftMessage(`${product.name} barcode ${barcodeValue} is already in the cart.`);
          return current;
        }

        const currentQuantity = Math.max(1, Number(existingItem.quantity || 1));
        const nextQuantity = currentQuantity + Number(quantityDelta || 1);

        if (nextQuantity > availableStock) {
          setDraftMessage(`Insufficient stock for ${product.name}. Available: ${availableStock}`);
          return current;
        }

        setDraftMessage("");
        return current
          .map((item, index) =>
            index === existingIndex
              ? {
                  ...item,
                  stock: availableStock,
                  quantity: nextQuantity,
                  lineTotal: nextQuantity * Number(item.price || 0),
                }
              : item
          )
          .filter(Boolean);
      }

      const initialQuantity = Math.max(1, Number(quantityDelta || 1));
      if (initialQuantity > availableStock) {
        setDraftMessage(`Insufficient stock for ${product.name}. Available: ${availableStock}`);
        return current;
      }

      setDraftMessage("");
      return [
        ...current,
        {
          productId: product._id,
          name: product.name,
          price: Number(product.price || 0),
          stock: availableStock,
          quantity: initialQuantity,
          lineTotal: Number(product.price || 0) * initialQuantity,
          barcode: barcodeValue,
          barcodeId: barcodeIdValue,
        },
      ];
    });

    return true;
  }

  function upsertFromBarcodeCode(product, code, messageSuffix = "added to the cart", barcodeInfo = null) {
    // Shared helper for camera scans, manual scans, and cache fallback.
    const added = upsertCartItem(product, 1, barcodeInfo);
    if (added) {
      setBarcode("");
      setDraftMessage(`${product.name} ${messageSuffix}`);
      setScanStatus(`Last scan: ${code}`);
    }
  }

  async function processBarcodeCode(code, source = "manual") {
    // Try the barcode API first, then fall back to locally known product data.
    const normalizedCode = String(code || "").trim();
    if (!normalizedCode) {
      setDraftMessage("Scan a barcode or QR code to add an item.");
      return;
    }

    setBarcode(normalizedCode);

    const fallbackProduct = products.find((product) =>
      Array.isArray(product.barcodes) && product.barcodes.some((entry) => entry.code === normalizedCode)
    );

    if (!normalizedCode) {
      setDraftMessage("Scan a barcode or QR code to add an item.");
      return;
    }

    try {
      const response = await fetch("/api/barcodes/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: normalizedCode }),
      });
      const data = await response.json();

      if (!response.ok || !data?.data?.product) {
        if (!fallbackProduct) {
          throw new Error(data?.message || "Barcode not found");
        }
        upsertFromBarcodeCode(
          fallbackProduct,
          normalizedCode,
          source === "camera" ? "added from camera cache" : "added from offline cache",
          { code: normalizedCode }
        );
        return;
      }

      upsertFromBarcodeCode(data.data.product, normalizedCode, "added to the cart", data.data.barcode);
    } catch (err) {
      if (fallbackProduct) {
        upsertFromBarcodeCode(
          fallbackProduct,
          normalizedCode,
          source === "camera" ? "added from camera cache" : "added from offline cache",
          { code: normalizedCode }
        );
        return;
      }

      setDraftMessage(err.message || "Scan failed");
    }
  }

  async function handleScan() {
    await processBarcodeCode(barcode, "manual");
  }

  async function handleCheckout() {
    // Save the cart as a pending order so approval can happen later.
    if (!cart.length) {
      setDraftMessage("Add at least one product before checkout.");
      return;
    }

    try {
      const subtotal = cart.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
      const taxRate = Number(settings?.billing?.taxPercentage || 0);
      const taxAmount = subtotal * (taxRate / 100);
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: "Walk-in Customer",
          items: cart.map((item) => ({
            productId: item.productId,
            barcodeId: item.barcodeId || null,
            barcode: item.barcode || "",
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            lineTotal: item.lineTotal,
          })),
          subtotal,
          taxAmount,
          totalAmount: subtotal + taxAmount,
          status: "PENDING_APPROVAL",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Checkout failed");
      }

      setCart([]);
      window.localStorage.removeItem(DRAFT_KEY);
      setDraftMessage(`Order ${data?.data?.order?.orderNumber || "saved"} is waiting for owner approval.`);
      await refreshOrders();
      await refreshProducts();
    } catch (err) {
      setDraftMessage(err.message || "Checkout failed");
    }
  }

  function updateCartQuantity(productId, nextQuantity) {
    const availableStock = getAvailableStock(productId);
    const normalizedQuantity = Math.max(1, Number(nextQuantity || 1));
    const currentItem = cart.find((item) => String(item.productId) === String(productId));
    const itemName = currentItem?.name || "This product";

    if (availableStock <= 0) {
      setDraftMessage(`${itemName} is out of stock.`);
      return;
    }

    if (normalizedQuantity > availableStock) {
      setDraftMessage(`Insufficient stock for ${itemName}. Available: ${availableStock}`);
      return;
    }

    setDraftMessage("");
    setCart((current) =>
      current
        .map((item) =>
          item.productId === productId
            ? {
                ...item,
                stock: availableStock,
                quantity: normalizedQuantity,
                lineTotal: normalizedQuantity * Number(item.price || 0),
              }
            : item
        )
        .filter(Boolean)
    );
  }

  function removeFromCart(itemKey) {
    setCart((current) => current.filter((item) => getCartItemKey(item) !== itemKey));
  }

  async function handleApprove(orderId) {
    // Approve an order and refresh the list so stock changes are visible.
    try {
      setActionMessage("");
      const response = await fetch(`/api/orders/${orderId}/approve`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Approval failed");
      }
      await refreshOrders();
      await refreshProducts();
      setActionMessage(data?.message || "Order approved and stock updated");
    } catch (err) {
      setActionMessage(err.message || "Approval failed");
    }
  }

  async function handleCancel(orderId) {
    // Cancel an order and refresh the current list.
    try {
      setActionMessage("");
      const response = await fetch(`/api/orders/${orderId}/cancel`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Cancellation failed");
      }
      await refreshOrders();
      await refreshProducts();
      setActionMessage(data?.message || "Order cancelled");
    } catch (err) {
      setActionMessage(err.message || "Cancellation failed");
    }
  }

  async function handleSoftDelete(orderId) {
    // Soft delete reuses cancellation so the order stays auditable but disappears from active workflow.
    try {
      setActionMessage("");
      const response = await fetch(`/api/orders/${orderId}/cancel`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Soft delete failed");
      }
      await refreshOrders();
      await refreshProducts();
      setActionMessage(data?.message || "Order moved to soft delete");
    } catch (err) {
      setActionMessage(err.message || "Soft delete failed");
    }
  }

  const filteredOrders = useMemo(() => {
    // Memoize the filtered list so typing in search stays efficient.
    if (!search) {
      return orders;
    }

    const term = search.toLowerCase();
    return orders.filter((order) => `${order.orderNumber} ${order.customerName}`.toLowerCase().includes(term));
  }, [orders, search]);

  const stats = [
    {
      title: "Total Orders",
      value: orders.length,
      helper: "Orders in your workspace",
      icon: MdShoppingCart,
      accent: "bg-indigo-50 text-indigo-600",
    },
    {
      title: "Completed",
      value: orders.filter((order) => order.status === "COMPLETED").length,
      helper: "Successfully approved",
      icon: MdOutlineDoneAll,
      accent: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "Pending",
      value: orders.filter((order) => order.status === "PENDING_APPROVAL").length,
      helper: "Waiting for review",
      icon: MdLocalShipping,
      accent: "bg-sky-50 text-sky-600",
    },
    {
      title: "Cancelled",
      value: orders.filter((order) => order.status === "CANCELLED").length,
      helper: "Needs review",
      icon: MdOutlineCancel,
      accent: "bg-rose-50 text-rose-600",
    },
  ];

  const quickAddProducts = showAllQuickProducts ? products : products.slice(0, 4);
  const canExpandQuickProducts = products.length > 4;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.14),_transparent_30%),linear-gradient(180deg,#eff4ff_0%,#f8fbff_45%,#eef2ff_100%)] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[28px] border border-white/70 bg-white/80 px-5 py-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-500">Orders</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">Orders Overview</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Track incoming purchases, approval stages, and completed bills from the POS workflow.
              </p>
            </div>

            <div className="flex w-full min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:w-auto">
              <MdSearch className="text-xl text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search orders..."
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[28px] border border-white/70 bg-white/90 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-500">Billing</p>
                <h2 className="mt-2 text-xl font-bold text-slate-900">Orders Page POS</h2>
                <p className="mt-1 text-sm text-slate-500">Barcode scan, draft cart, and checkout live here only.</p>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
                {isOffline ? <MdWifiOff className="text-amber-500" /> : <MdSync className="text-emerald-500" />}
                {isOffline ? "Offline" : "Online"}
              </div>
            </div>

            <div className="grid gap-4 px-5 py-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <BarcodeCameraScanner
                  onScan={(code) => processBarcodeCode(code, "camera")}
                  onStatus={setScanStatus}
                  className="shadow-sm"
                />

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Barcode Scanner</label>
                  <div className="mt-3 flex gap-3">
                    <input
                      value={barcode}
                      onChange={(event) => setBarcode(event.target.value)}
                      onKeyDown={(event) => event.key === "Enter" && handleScan()}
                      placeholder="Scan or type barcode"
                      className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-indigo-300"
                    />
                    <button
                      onClick={handleScan}
                      className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200"
                    >
                      <MdOutlineQrCodeScanner className="text-lg" />
                      Scan
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">{scanStatus}</p>
                </div>

                {draftMessage ? (
                  <div className="rounded-3xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">{draftMessage}</div>
                ) : null}

                <div className="rounded-3xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <MdOutlineInventory2 className="text-lg text-indigo-600" />
                      <h3 className="font-semibold text-slate-900">Quick Add Products</h3>
                    </div>
                    <p className="text-xs text-slate-500">{productLoading ? "Loading..." : `${products.length} available`}</p>
                  </div>
                  <div className="max-h-[330px] overflow-auto p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {quickAddProducts.map((product) => (
                        <button
                          key={product._id}
                          onClick={() => upsertCartItem(product)}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-indigo-300 hover:bg-white"
                        >
                          <p className="font-semibold text-slate-900">{product.name}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatCurrency(product.price)} · Stock {product.stock}
                          </p>
                        </button>
                      ))}
                    </div>
                    {canExpandQuickProducts ? (
                      <div className="mt-4 flex justify-center">
                        <button
                          type="button"
                          onClick={() => setShowAllQuickProducts((current) => !current)}
                          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                        >
                          {showAllQuickProducts ? "Show less" : `Show more (${products.length - 4})`}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MdShoppingCart className="text-lg text-indigo-600" />
                    <h3 className="font-semibold text-slate-900">Draft Cart</h3>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">{cart.length} items</span>
                </div>

                <div className="mt-4 space-y-3">
                  {cart.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                      Scan a barcode or tap a product to start billing.
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div key={getCartItemKey(item)} className="rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{item.name}</p>
                            {item.barcode ? <p className="mt-1 text-xs text-slate-400">Barcode: {item.barcode}</p> : null}
                            <p className="mt-1 text-sm text-slate-500">{formatCurrency(item.price)} each</p>
                          </div>
                          <button
                            onClick={() => removeFromCart(getCartItemKey(item))}
                            className="rounded-full p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          >
                            <MdDelete />
                          </button>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          {item.barcode ? (
                            <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">Qty 1</span>
                          ) : (
                            <div className="flex items-center gap-2 rounded-full bg-slate-50 p-1">
                              <button
                                onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                                className="rounded-full px-3 py-1 text-slate-500 transition hover:bg-white"
                              >
                                <MdChevronLeft />
                              </button>
                              <span className="min-w-10 text-center text-sm font-semibold text-slate-900">{item.quantity}</span>
                              <button
                                onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                                disabled={Number(item.quantity || 1) >= getAvailableStock(item.productId)}
                                className="rounded-full px-3 py-1 text-slate-500 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                                title={
                                  Number(item.quantity || 1) >= getAvailableStock(item.productId)
                                    ? `Max stock reached (${getAvailableStock(item.productId)})`
                                    : "Increase quantity"
                                }
                              >
                                <MdChevronRight />
                              </button>
                            </div>
                          )}
                          <p className="text-sm font-semibold text-slate-900">{formatCurrency(item.lineTotal)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-5 rounded-3xl bg-slate-900 p-4 text-white">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>Subtotal</span>
                    <span>{formatCurrency(cart.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0))}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-slate-300">
                    <span>Tax</span>
                    <span>{Number(settings?.billing?.taxPercentage || 0)}%</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>
                      {formatCurrency(
                        cart.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0) *
                          (1 + Number(settings?.billing?.taxPercentage || 0) / 100)
                      )}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleCheckout}
                    className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200"
                  >
                    Create Pending Bill
                  </button>
                  <button
                    onClick={() => {
                      setCart([]);
                      setDraftMessage("Draft cart cleared");
                      window.localStorage.removeItem(DRAFT_KEY);
                    }}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                  >
                    Clear
                  </button>
                </div>
              </aside>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
            <h3 className="text-lg font-semibold text-slate-900">Billing Rules</h3>
            <p className="mt-1 text-sm text-slate-500">These settings are loaded from the backend.</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Stock deduction</p>
                <p className="mt-1">Stock is deducted only after owner approval.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Offline drafts</p>
                <p className="mt-1">Cart items are stored locally so billing can continue without internet.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Invoice mode</p>
                <p className="mt-1">{settings?.billing?.invoiceEnabled ? "Printable invoice is enabled." : "Simple receipt mode only."}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </section>

        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div>
        ) : null}

        {actionMessage ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">{actionMessage}</div>
        ) : null}

        <section className="rounded-[28px] border border-white/70 bg-white/90 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Recent Orders</h2>
              <p className="text-sm text-slate-500">Latest orders from your customers.</p>
            </div>
            <div className="hidden rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-500 md:block">
              Showing {filteredOrders.length} recent entries
            </div>
          </div>

          {loading ? (
            <div className="p-5 text-sm text-slate-500">Loading orders...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">No orders yet.</div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-400">
                      <th className="px-5 py-4 font-semibold">Order</th>
                      <th className="px-5 py-4 font-semibold">Customer</th>
                      <th className="px-5 py-4 font-semibold">Date</th>
                      <th className="px-5 py-4 font-semibold">Amount</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order._id} className="group border-t border-slate-100 transition hover:bg-slate-50/80">
                        <td className="px-5 py-4 font-semibold text-slate-900">{order.orderNumber}</td>
                        <td className="px-5 py-4 text-slate-700">{order.customerName}</td>
                        <td className="px-5 py-4 text-slate-700">{orderDateTimeFormatter.format(new Date(order.createdAt))}</td>
                        <td className="px-5 py-4 font-semibold text-slate-900">₹{Number(order.totalAmount || 0).toLocaleString("en-IN")}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={order.status} />
                            {order.status === "PENDING_APPROVAL" || order.status === "DRAFT" ? (
                              <>
                                <button onClick={() => handleApprove(order._id)} className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">Approve</button>
                                <button
                                  onClick={() => handleSoftDelete(order._id)}
                                  className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-100 transition hover:bg-rose-100"
                                  aria-label="Soft delete order"
                                  title="Soft delete order"
                                >
                                  <MdDelete className="text-sm" />
                                  Delete
                                </button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 p-4 md:hidden">
                {filteredOrders.map((order) => (
                  <article key={order._id} className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{order.orderNumber}</p>
                        <p className="text-sm text-slate-500">{order.customerName}</p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl bg-white p-3">
                        <p className="text-xs text-slate-500">Date</p>
                        <p className="mt-1 font-medium text-slate-900">{orderDateTimeFormatter.format(new Date(order.createdAt))}</p>
                      </div>
                      <div className="rounded-2xl bg-white p-3">
                        <p className="text-xs text-slate-500">Amount</p>
                        <p className="mt-1 font-medium text-slate-900">₹{Number(order.totalAmount || 0).toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                    {order.status === "PENDING_APPROVAL" || order.status === "DRAFT" ? (
                      <div className="mt-4 flex gap-2">
                        <button onClick={() => handleApprove(order._id)} className="flex-1 rounded-2xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Approve</button>
                        <button
                          onClick={() => handleSoftDelete(order._id)}
                          className="inline-flex items-center justify-center rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-100"
                          aria-label="Soft delete order"
                          title="Soft delete order"
                        >
                          <MdDelete className="text-lg" />
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
