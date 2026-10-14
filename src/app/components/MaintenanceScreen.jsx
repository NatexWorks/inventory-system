"use client";

export default function MaintenanceScreen({ onRetry }) {
  function handleRetry() {
    if (onRetry) {
      onRetry();
      return;
    }
    window.location.reload();
  }

  return (
    <main
      role="alert"
      aria-live="assertive"
      className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-center text-white"
    >
      <section className="w-full max-w-xl rounded-[32px] border border-white/10 bg-white/[0.06] p-8 shadow-2xl sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-3xl text-amber-300">
          !
        </div>
        <p className="mt-7 text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
          Inventory System
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Site Under Maintenance
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-300 sm:text-base">
          We’re experiencing a temporary technical issue. The site is temporarily unavailable.
          Please try again shortly.
        </p>
        <button
          type="button"
          onClick={handleRetry}
          className="mt-8 rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
