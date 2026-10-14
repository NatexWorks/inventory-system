"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MdArrowForward, MdEmail } from "react-icons/md";

const baseField =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white";

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to request a reset code");
      }

      // Test OTPs are only exposed when explicitly enabled in local, non-production runs.
      if (payload?.data?.developmentOtp) {
        sessionStorage.setItem("inventory-reset-development-otp", payload.data.developmentOtp);
      }
      setMessage(payload?.message || "If the account exists, a reset code has been sent.");
      router.push(`/reset-password?email=${encodeURIComponent(email.trim())}`);
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
            Reset access
          </div>
          <h1 className="mt-6 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">Forgot password</h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/75">
            Enter your account email. We will send a one-time code to verify the reset request.
          </p>
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/10 p-4 text-sm text-white/80">
            The code expires in 10 minutes and works only once.
          </div>
        </section>

        <section className="rounded-[28px] bg-white p-8 shadow-[0_16px_35px_rgba(15,23,42,0.12)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-500">Account Recovery</p>
          <h2 className="mt-3 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">Get a reset code</h2>
          <p className="mt-2 text-sm text-slate-500">For privacy, the same confirmation is shown whether or not the email belongs to an active account.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
              <div className="relative">
                <MdEmail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={`${baseField} pl-12`}
                  placeholder="admin@store.com"
                  autoComplete="email"
                  required
                />
              </div>
            </label>

            {error ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
            {message ? <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-500 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Sending code..." : "Send reset code"}
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
