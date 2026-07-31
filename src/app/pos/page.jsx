// POS page for quick billing and barcode-based cart building.

"use client";

import { useEffect, useMemo, useState } from "react";
import { MdPointOfSale, MdShoppingCart } from "react-icons/md";
import BarcodeCameraScanner from "../components/BarcodeCameraScanner";

// Formats rupee values consistently in the POS screen.
function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export default function PosPage() {
  // Local state keeps the draft bill responsive while scanning and clicking items.
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [barcode, setBarcode] = useState("");
  const [message, setMessage] = useState("");
  const [scanStatus, setScanStatus] = useState("Camera scanner ready");
  const [loading, setLoading] = useState(true);

  // Fetch available products once so they can be added to the draft bill.
  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        const response = await fetch("/api/product?page=1&search=");
        const data = await response.json();
        setProducts(data?.data?.products || []);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  const total = useMemo(() => cart.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0), [cart]);

  function getAvailableStock(productId) {
    const product = products.find((item) => String(item._id) === String(productId));
    return Math.max(0, Number(product?.stock ?? 0));
  }

  function addProductToCart(product) {
    // Adds the item once, then increments quantity on repeat taps.
    const availableStock = Math.max(0, Number(product?.stock ?? getAvailableStock(product._id)));
    if (availableStock <= 0) {
      setMessage(`${product.name} is out of stock.`);
      return false;
    }

    const existing = cart.find((item) => item.productId === product._id);
    if (existing) {
      const nextQuantity = Number(existing.quantity || 1) + 1;
      if (nextQuantity > availableStock) {
        setMessage(`Insufficient stock for ${product.name}. Available: ${availableStock}`);
        return false;
      }

      setCart((prev) =>
        prev.map((item) =>
          item.productId === product._id
            ? { ...item, stock: availableStock, quantity: nextQuantity, lineTotal: nextQuantity * item.price }
            : item
        )
      );
      setMessage(`${product.name} quantity is already at ${nextQuantity}`);
      return true;
    } else {
      setMessage("");
      setCart((prev) => [
        ...prev,
        {
          productId: product._id,
          name: product.name,
          price: Number(product.price || 0),
          stock: availableStock,
          quantity: 1,
          lineTotal: Number(product.price || 0),
        },
      ]);
      return true;
    }
  }

  async function processBarcode(code, source = "manual") {
    // Barcode lookup tries the API first and falls back to cached product data.
    const normalizedCode = String(code || "").trim();
    if (!normalizedCode) {
      setMessage("Enter or scan a barcode first");
      return;
    }

    const fallback = products.find((product) =>
      Array.isArray(product.barcodes) && product.barcodes.some((entry) => entry.code === normalizedCode)
    );

    try {
      const response = await fetch("/api/barcodes/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: normalizedCode }),
      });
      const data = await response.json();

      if (!response.ok || !data?.data?.product) {
        if (!fallback) {
          setMessage(data?.message || "Product not found");
          return;
        }

        if (addProductToCart(fallback)) {
          setBarcode("");
          setMessage(`${fallback.name} added from ${source === "camera" ? "camera" : "cache"}`);
          setScanStatus(`Last scan: ${normalizedCode}`);
        }
        return;
      }

      const product = data.data.product;
      if (addProductToCart(product)) {
        setBarcode("");
        setMessage(`${product.name} added to draft cart`);
        setScanStatus(`Last scan: ${normalizedCode}`);
      }
    } catch {
      if (fallback) {
        if (addProductToCart(fallback)) {
          setBarcode("");
          setMessage(`${fallback.name} added from cache`);
          setScanStatus(`Last scan: ${normalizedCode}`);
        }
        return;
      }

      setMessage("Scan failed");
    }
  }

  async function handleScan() {
    await processBarcode(barcode, "manual");
  }

  async function approveOrder() {
    // Submits the draft bill as a pending order, matching the approval workflow.
    if (!cart.length) {
      setMessage("Add at least one product");
      return;
    }

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PENDING_APPROVAL",
          items: cart.map((item) => ({
            productId: item.productId,
            barcode: item.barcode || "",
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            lineTotal: item.lineTotal,
          })),
          subtotal: total,
          totalAmount: total,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Approval failed");
      }
      setCart([]);
      setMessage(`Order ${data?.data?.order?.orderNumber || "created"} is waiting for owner approval`);
    } catch (error) {
      setMessage(error.message || "Approval failed");
    }
  }

  return (
    <div className="min-h-screen  bg-slate-50 p-4 md:p-6">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500">POS</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">Offline-first billing draft</h1>
            </div>
            <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600"><MdPointOfSale className="text-2xl" /></div>
          </div>

          <BarcodeCameraScanner
            className="mt-5"
            onScan={(code) => processBarcode(code, "camera")}
            onStatus={setScanStatus}
          />

          <div className="mt-4 flex gap-3">
            <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Barcode</label>
              <input
                value={barcode}
                onChange={(event) => setBarcode(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleScan()}
                placeholder="Scan or type barcode"
                className="mt-2 w-full bg-transparent text-sm text-slate-700 outline-none"
              />
            </div>
            <button onClick={handleScan} className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white">
              Scan
            </button>
          </div>

          <p className="mt-2 text-xs text-slate-500">{scanStatus}</p>

          {message ? <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">{message}</div> : null}

          <div className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Available products</h2>
            {loading ? <div className="mt-3 text-sm text-slate-500">Loading products...</div> : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {products.map((product) => (
                  <button key={product._id} onClick={() => addProductToCart(product)} disabled={Number(product.stock || 0) <= 0} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-indigo-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">
                    <p className="font-semibold text-slate-900">{product.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{formatCurrency(product.price)} · Stock {product.stock}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <MdShoppingCart className="text-xl text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900">Draft bill</h2>
          </div>

          <div className="mt-4 space-y-3">
            {cart.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No items yet. Scan a barcode or tap a product.</div> : cart.map((item) => (
              <div key={item.productId} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-500">{item.quantity} × {formatCurrency(item.price)}</p>
                  </div>
                  <p className="font-semibold text-slate-900">{formatCurrency(item.lineTotal)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl bg-slate-900 p-4 text-white">
            <div className="flex items-center justify-between text-sm text-slate-300"><span>Subtotal</span><span>{formatCurrency(total)}</span></div>
            <div className="mt-3 flex items-center justify-between text-lg font-semibold"><span>Total</span><span>{formatCurrency(total)}</span></div>
          </div>

          <div className="mt-6 flex gap-3">
            <button onClick={approveOrder} className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white">Continue / Approve</button>
            <button onClick={() => { setCart([]); setMessage("Cart cleared"); }} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">Clear</button>
          </div>

          <div className="mt-4 text-xs text-slate-500">Stock is deducted only after approval, matching the required workflow.</div>
        </aside>
      </div>
    </div>
  );
}
