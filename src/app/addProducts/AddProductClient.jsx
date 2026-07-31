"use client";

import { useEffect, useState } from "react";
import ProductForm from "../components/productForm";
import { fetchCategories } from "../components/productFetch";

export default function AddProductClient({ id }) {
  const initialFormState = {
    name: "",
    price: "",
    stock: "",
    costPrice: "",
    category: "",
    sku: "",
    description: "",
    manualBarcodes: "",
  };
  const [Form, setFormData] = useState({
    ...initialFormState,
  });
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoryError, setCategoryError] = useState("");
  const [barcodeNotice, setBarcodeNotice] = useState("");
  const [existingBarcodeCount, setExistingBarcodeCount] = useState(0);
  const [submitError, setSubmitError] = useState("");

  function appendBarcode(code) {
    const normalizedCode = String(code || "").trim();
    if (!normalizedCode) {
      return;
    }

    setFormData((current) => {
      const existing = String(current.manualBarcodes || "")
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean);

      if (existing.includes(normalizedCode)) {
        setBarcodeNotice(`Barcode ${normalizedCode} already exists in the list.`);
        return current;
      }

      const nextValue = current.manualBarcodes ? `${current.manualBarcodes.trimEnd()}\n${normalizedCode}` : normalizedCode;
      setBarcodeNotice(`Barcode ${normalizedCode} added.`);
      return {
        ...current,
        manualBarcodes: nextValue,
      };
    });
  }

  function removeBarcode(codeToRemove) {
    const normalizedCode = String(codeToRemove || "").trim();
    if (!normalizedCode) {
      return;
    }

    setBarcodeNotice(`Barcode ${normalizedCode} removed.`);
    setFormData((current) => {
      const nextBarcodes = String(current.manualBarcodes || "")
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean)
        .filter((item) => item !== normalizedCode);

      return {
        ...current,
        manualBarcodes: nextBarcodes.join("\n"),
      };
    });
  }

  // handleChange function to update form state on input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  // Handles the form submit event and collects values from the inputs
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const manualBarcodes = Array.from(
      new Set(
        String(formData.get("manualBarcodes") || "")
          .split(/[\n,]/)
          .map((code) => code.trim())
          .filter(Boolean)
      )
    );

    // Build a plain object so it can be sent as JSON to the API
    const data = {
      name: formData.get("name"),
      price: formData.get("price"),
      stock: formData.get("stock"),
      costPrice: formData.get("costPrice"),
      category: formData.get("category"),
      sku: formData.get("sku"),
      description: formData.get("description"),
      barcodes: manualBarcodes.map((code) => ({ code, state: "AVAILABLE" })),
    };
    // Send the product data to the backend API

    setSubmitError("");
    setBarcodeNotice("");
    await createProducts(data);
  };

  // Calls the API route that stores a new product in MongoDB
  async function createProducts(data) {
    try {
      const payload = {
        ...data,
      };

      if (id) {
        const response = await fetch(`/api/product/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const responsePayload = await response.json();
        if (!response.ok) {
          throw new Error(responsePayload?.message || "Failed to update product");
        }
      } else {
        const response = await fetch("/api/product", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const responsePayload = await response.json();
        if (!response.ok) {
          throw new Error(responsePayload?.message || "Failed to add product");
        }
      }

      if (!id) {
        setFormData({ ...initialFormState });
        setExistingBarcodeCount(0);
        setBarcodeNotice("");
      }
    } catch (error) {
      setSubmitError(error.message || "Something went wrong");
      console.error(error);
    }
  }

  // edit
  useEffect(() => {
    let active = true;

    async function loadProduct() {
      if (!id) {
        setFormData({ ...initialFormState });
        setExistingBarcodeCount(0);
        return;
      }

      const res = await fetch(`/api/product/${id}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!active) return;
      const existingBarcodes = Array.isArray(data?.product?.barcodes) ? data.product.barcodes : [];
      setFormData({
        name: data?.product?.name || "",
        price: data?.product?.price ?? "",
        stock: data?.product?.stock ?? "",
        costPrice: data?.product?.costPrice ?? "",
        category: data?.product?.category || "",
        sku: data?.product?.sku || "",
        description: data?.product?.description || "",
        manualBarcodes: existingBarcodes.map((item) => item?.code).filter(Boolean).join("\n"),
      });
      setExistingBarcodeCount(existingBarcodes.length);
    }

    loadProduct();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;

    async function loadCategories() {
      try {
        setLoadingCategories(true);
        setCategoryError("");
        const data = await fetchCategories();
        if (!active) return;
        setCategories(data.categories || []);
      } catch (error) {
        if (active) {
          setCategoryError(error.message || "Failed to load categories");
          setCategories([]);
        }
      } finally {
        if (active) {
          setLoadingCategories(false);
        }
      }
    }

    loadCategories();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.14),_transparent_30%),linear-gradient(180deg,#eff4ff_0%,#f8fbff_45%,#eef2ff_100%)] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[28px] border border-white/70 bg-white/80 px-5 py-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-500">Products</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">{id ? "Edit Product" : "Add New Product"}</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Create a new catalog item or update an existing one with pricing, stock, and category details.
              </p>
            </div>

          <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Mode</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{id ? "Editing" : "Creating"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Fields</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Name, price, stock</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Status</p>
                <p className="mt-1 text-sm font-semibold text-emerald-600">Ready to save</p>
              </div>
              {id ? (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 sm:col-span-3 xl:col-span-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-400">Existing barcodes</p>
                  <p className="mt-1 text-sm font-semibold text-indigo-700">{existingBarcodeCount}</p>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <ProductForm
          formData={Form}
          handleChange={handleChange}
          handleSubmit={handleSubmit}
          change={id ? "Edit Product" : "Add Product"}
          categories={categories}
          onBarcodeScan={appendBarcode}
          onBarcodeRemove={removeBarcode}
          barcodeNotice={barcodeNotice}
          barcodeRequired={false}
          barcodeMode="optional"
        />
        {categoryError ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
            {categoryError}
          </div>
        ) : submitError ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {submitError}
          </div>
        ) : loadingCategories ? (
          <div className="rounded-3xl border border-slate-200 bg-white/80 px-5 py-4 text-sm text-slate-500">
            Loading categories for the product form...
          </div>
        ) : null}
      </div>
    </div>
  );
}
