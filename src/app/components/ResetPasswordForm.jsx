"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MdArrowForward, MdLockOutline } from "react-icons/md";

const baseField =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white";

export default function ResetPasswordForm({ token = "", email = "" }) {
  const router = useRouter();
  const isLegacyToken = Boolean(token);
  const [form, setForm] = useState({
    email,
    otp: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize the form when the URL email changes without a remount.
    setForm((current) => ({ ...current, email }));
  }, [email]);

  useEffect(() => {
    // Only local test runs can return an OTP to the browser; production never does.
    if (typeof window === "undefined" || isLegacyToken) return;
    const developmentOtp = sessionStorage.getItem("inventory-reset-development-otp");
    if (developmentOtp) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate the one-time local test code from sessionStorage.
      setForm((current) => ({ ...current, otp: developmentOtp }));
      sessionStorage.removeItem("inventory-reset-development-otp");
    }
  }, [isLegacyToken]);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const body = isLegacyToken
        ? { token, password: form.password, confirmPassword: form.confirmPassword }
        : {
            email: form.email.trim(),
            otp: form.otp,
            password: form.password,
            confirmPassword: form.confirmPassword,
          };

      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Failed to reset password");
      }

      setMessage(payload?.message || "Password reset successful");
      setTimeout(() => router.replace("/login"), 1200);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_40%),linear-gradient(180deg,#081028_0%,#0f172a_100%)] px-4 py-10">
      <div className="grid w-full max-w-4xl gap-8 overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-4 shadow-[0_30px_100px_rgba(15,23,42,0.45)] backdrop-blur md:grid-cols-[1fr_0.9fr] md:p-6">
        <section className="rounded-[28px] bg-[linear-gradient(160deg,#0f172a_0%,#172554_55%,#2563eb_100%)] p-8 text-white">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
            Secure reset
          </div>
          <h1 className="mt-6 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">Create a new password</h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/75">
            Enter the one-time code sent to your inbox and choose a new password.
          </p>
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/10 p-4 text-sm text-white/80">
            Codes expire after 10 minutes and can be used only once.
          </div>
        </section>

        <section className="rounded-[28px] bg-white p-8 shadow-[0_16px_35px_rgba(15,23,42,0.12)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-500">Reset Password</p>
          <h2 className="mt-3 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">Set a new password</h2>
          <p className="mt-2 text-sm text-slate-500">
            {isLegacyToken ? "A reset link was opened." : form.email ? `Enter the code sent to ${form.email}.` : "Enter your account email and the code sent to it."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {!isLegacyToken ? (
              <>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    className={baseField}
                    placeholder="admin@store.com"
                    autoComplete="email"
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Email verification code</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={form.otp}
                    onChange={(event) => setForm((current) => ({ ...current, otp: event.target.value.replace(/[^0-9]/g, "").slice(0, 6) }))}
                    className={baseField}
                    placeholder="Enter 6-digit code"
                    required
                  />
                </label>
              </>
            ) : null}

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">New Password</span>
              <div className="relative">
                <MdLockOutline className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-slate-400" />
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  className={`${baseField} pl-12`}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Confirm Password</span>
              <div className="relative">
                <MdLockOutline className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-slate-400" />
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                  className={`${baseField} pl-12`}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                />
              </div>
            </label>

            {error ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
            {message ? <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

            <button
              type="submit"
              disabled={loading || (!isLegacyToken && (!form.email.trim() || form.otp.length !== 6))}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-500 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Please wait..." : "Reset password"}
              <MdArrowForward className="text-lg" />
            </button>
          </form>

          <div className="mt-6 text-sm text-slate-500">
            Back to{" "}
            <Link href="/login" className="font-semibold text-indigo-600 transition hover:text-indigo-500">
              login
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
