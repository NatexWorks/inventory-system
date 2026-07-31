"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MdArrowForward, MdLockOutline, MdPersonOutline } from "react-icons/md";

// Shared input styling so both login and signup screens stay visually consistent.
const baseField =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white";

export default function AuthForm({ mode = "login", redirectPath = "/" }) {
  // `mode` decides whether this form behaves like login or signup.
  const isSignup = mode === "signup";
  const router = useRouter();

  // `useState` stores form values and request status inside the component.
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "owner",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Updates only the field that changed while keeping the rest of the form intact.
  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  // Handles submit, calls the API, and then redirects when auth succeeds.
  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (isSignup) {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            password: form.password,
            role: form.role,
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.message || "Signup failed");
        }
        setMessage(payload?.message || "Signup successful");
      } else {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: form.email,
            password: form.password,
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.message || "Login failed");
        }
        setMessage(payload?.message || "Login successful");
      }

      router.replace(redirectPath);
      router.refresh();
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.18),transparent_40%),linear-gradient(180deg,#081028_0%,#0f172a_100%)] px-4 py-10">
      <div className="grid w-full max-w-6xl gap-8 overflow-hidden rounded-4xl border border-white/10 bg-white/5 p-4 shadow-[0_30px_100px_rgba(15,23,42,0.45)] backdrop-blur md:grid-cols-[1.1fr_0.9fr] md:p-6">
        <section className="flex flex-col justify-between rounded-[28px] bg-[linear-gradient(160deg,#0f172a_0%,#172554_55%,#2563eb_100%)] p-8 text-white">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
              Inventory SaaS
            </div>
            <h1 className="mt-6 max-w-md text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {isSignup ? "Create your store workspace" : "Sign in to your live dashboard"}
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-white/75">
              Manage products, orders, reports, and low-stock alerts from one secure place. Your account stays protected with a server-issued session cookie.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              ["Live data", "Every screen pulls from the backend"],
              ["Protected", "Login is required before app access"],
              ["Fast flow", "Signup creates your workspace instantly"],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-3xl border border-white/10 bg-white/10 p-4">
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1 text-xs leading-5 text-white/70">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] bg-white p-8 shadow-[0_16px_35px_rgba(15,23,42,0.12)]">
          <div className="max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-500">
              {isSignup ? "Create account" : "Welcome back"}
            </p>
            <h2 className="mt-3 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
              {isSignup ? "Start your inventory workspace" : "Login to continue"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {isSignup ? "Create your workspace profile in a few seconds." : "Enter your details to open the dashboard."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {isSignup ? (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Full Name</span>
                <div className="relative">
                  <MdPersonOutline className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-slate-400" />
                  <input
                    name="name"
                    value={form.name}
                    onChange={updateField}
                    className={`${baseField} pl-12`}
                    placeholder="Aman Verma"
                    required
                  />
                </div>
              </label>
            ) : null}

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
              <div className="relative">
                <MdPersonOutline className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-slate-400" />
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={updateField}
                  className={`${baseField} pl-12`}
                  placeholder="admin@store.com"
                  required
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
              <div className="relative">
                <MdLockOutline className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-slate-400" />
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={updateField}
                  className={`${baseField} pl-12`}
                  placeholder="********"
                  required
                />
              </div>
            </label>

            {isSignup ? (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Account Type</span>
                <select
                  name="role"
                  value={form.role}
                  onChange={updateField}
                  className={baseField}
                >
                  <option value="owner">Owner</option>
                  <option value="staff">Staff</option>
                </select>
              </label>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
            ) : null}

            {message ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-indigo-600 to-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-500 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Please wait..." : isSignup ? "Create account" : "Login"}
              <MdArrowForward className="text-lg" />
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between gap-4 text-sm text-slate-500">
            <div className="flex flex-col gap-1">
              <span>{isSignup ? "Already have an account?" : "Need an account?"}</span>
              {!isSignup ? (
                <Link href="/forgot-password" className="text-xs font-semibold text-slate-500 transition hover:text-indigo-600">
                  Forgot password?
                </Link>
              ) : null}
            </div>
            <Link href={isSignup ? "/login" : "/signup"} className="font-semibold text-indigo-600 transition hover:text-indigo-500">
              {isSignup ? "Login here" : "Create one"}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
