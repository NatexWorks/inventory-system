"use client";

import { useEffect, useRef } from "react";
import BarcodeCameraScanner from "./BarcodeCameraScanner";

// Small labeled field wrapper keeps repeated form markup readable.
function Field({ label, required = false, children, hint, htmlFor }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </label>
      {children}
      {hint ? <p className="mt-2 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

// Product form UI stays dumb and receives all state/handlers from the parent.
export default function ProductForm({
  formData,
  handleChange,
  handleSubmit,
  change,
  categories = [],
  onBarcodeScan,
  onBarcodeRemove,
  barcodeNotice = "",
  barcodeRequired = false,
  barcodeMode = "optional",
}) {
  const barcodeFieldRef = useRef(null);
  const barcodeListRef = useRef(null);
  const scannedBarcodes = String(formData.manualBarcodes || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const scannedCount = scannedBarcodes.length;

  useEffect(() => {
    if (barcodeFieldRef.current) {
      barcodeFieldRef.current.focus();
    }

    if (barcodeListRef.current) {
      barcodeListRef.current.scrollTop = barcodeListRef.current.scrollHeight;
    }
  }, [scannedCount]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
      <section className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-500">Products</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">{change}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Fill in the product details below. Barcode mode is {barcodeMode}.
            </p>
          </div>
          <div className="hidden rounded-2xl bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700 md:block">
            Stock, price, category, SKU, {barcodeRequired ? "strict barcodes" : "optional barcodes"}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Product Name" required htmlFor="name">
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white"
                onChange={handleChange}
                type="text"
                value={formData.name}
                name="name"
                id="name"
                placeholder="Enter product name"
                required
              />
            </Field>

            <Field label="Category" required htmlFor="category">
              <select
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white"
                id="category"
                onChange={handleChange}
                value={formData.category}
                name="category"
                required
              >
                <option value="" disabled>
                  Select category
                </option>
                {categories.map((category) => (
                  <option key={category._id || category.name} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Product Price" required htmlFor="price">
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white"
                onChange={handleChange}
                type="number"
                value={formData.price}
                name="price"
                id="price"
                placeholder="Enter selling price"
                required
              />
            </Field>

            <Field label="Cost Price" htmlFor="costPrice">
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white"
                onChange={handleChange}
                type="number"
                value={formData.costPrice}
                name="costPrice"
                id="costPrice"
                placeholder="Enter cost price"
              />
            </Field>

            <Field label="Product Stock" required htmlFor="stock">
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white"
                onChange={handleChange}
                type="number"
                value={formData.stock}
                name="stock"
                id="stock"
                placeholder="Enter stock quantity"
                required
              />
            </Field>

            <Field label="SKU" htmlFor="sku">
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white"
                onChange={handleChange}
                type="text"
                value={formData.sku}
                name="sku"
                id="sku"
                placeholder="Optional SKU"
              />
            </Field>

            <Field
              label="Manual Barcodes"
              htmlFor="manualBarcodes"
              required={barcodeRequired}
              hint={
                barcodeRequired
                  ? "Strict mode is enabled. Add at least one barcode before saving."
                  : "Optional: paste one barcode per line, or separate them with commas. Leave this empty if you do not want to assign barcodes now."
              }
            >
              <textarea
                ref={barcodeFieldRef}
                className="min-h-32 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white"
                onChange={handleChange}
                value={formData.manualBarcodes}
                name="manualBarcodes"
                id="manualBarcodes"
                placeholder={"ABC-001\nABC-002\nABC-003"}
                required={barcodeRequired}
              />
            </Field>
          </div>

          <Field label="Product Description" hint="Add key features, usage details, and product notes." htmlFor="description">
            <textarea
              className="min-h-32 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white"
              onChange={handleChange}
              value={formData.description}
              name="description"
              placeholder="Enter product description"
              id="description"
            />
          </Field>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">Double-check stock and category before saving.</p>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:scale-[1.01] hover:from-indigo-500 hover:to-violet-500"
            >
              {change}
            </button>
          </div>
        </form>
      </section>

      <aside className="space-y-5">
        <div className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-500">Tips</p>
          <h3 className="mt-2 text-xl font-bold text-slate-900">Before you save</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li className="rounded-2xl bg-slate-50 px-4 py-3">Use a clear product name that matches your invoice records.</li>
            <li className="rounded-2xl bg-slate-50 px-4 py-3">Keep SKU unique so search and edits stay fast later.</li>
            <li className="rounded-2xl bg-slate-50 px-4 py-3">Set stock carefully to keep low-stock alerts accurate.</li>
            <li className="rounded-2xl bg-slate-50 px-4 py-3">Choose the correct category for better filtering and reports.</li>
            <li className="rounded-2xl bg-slate-50 px-4 py-3">You can paste barcodes or capture them from the camera before saving.</li>
          </ul>
        </div>

        <div className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-500">Camera Capture</p>
              <h3 className="mt-2 text-xl font-bold text-slate-900">Scan barcodes in camera</h3>
              <p className="mt-1 text-sm text-slate-500">
                Each scan gets appended into the manual barcode list below, then saved with the product.
              </p>
            </div>
            <div className="rounded-2xl bg-indigo-50 px-4 py-3 text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-indigo-500">Captured</p>
              <p className="mt-1 text-2xl font-bold text-indigo-700">{scannedCount}</p>
            </div>
          </div>

          <div className="mt-4">
            <BarcodeCameraScanner
              onScan={onBarcodeScan}
              onStatus={() => {}}
              className="border border-slate-200"
            />
          </div>

          {barcodeNotice ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {barcodeNotice}
            </div>
          ) : null}

          <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">Captured barcodes</p>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                {scannedCount} saved
              </span>
            </div>
            <div ref={barcodeListRef} className="mt-3 max-h-44 space-y-2 overflow-auto pr-1">
              {scannedBarcodes.length > 0 ? (
                scannedBarcodes.map((code, index) => (
                  <div
                    key={`${code}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"
                  >
                    <span className="font-medium">{code}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">#{index + 1}</span>
                      {onBarcodeRemove ? (
                        <button
                          type="button"
                          onClick={() => onBarcodeRemove(code)}
                          className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                  No barcodes captured yet. Scan from the camera or type them manually above.
                </div>
              )}
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Scan one barcode at a time. The code will appear in the manual barcode field automatically.
          </p>
        </div>

        <div className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-500">Preview</p>
          <div className="mt-4 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-5">
            <div className="flex h-40 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white">
              <div className="text-center">
                <p className="text-sm text-slate-300">Product preview</p>
                <p className="mt-1 text-lg font-semibold">{formData.name || "New Product"}</p>
                <p className="mt-2 text-sm text-slate-300">{formData.category || "Category"}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-white p-3">
                <p className="text-xs text-slate-500">Price</p>
                <p className="mt-1 font-semibold text-slate-900">{formData.price || "0"}</p>
              </div>
              <div className="rounded-2xl bg-white p-3">
                <p className="text-xs text-slate-500">Stock</p>
                <p className="mt-1 font-semibold text-slate-900">{formData.stock || "0"}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
