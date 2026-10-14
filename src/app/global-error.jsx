"use client";

export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#020617",
          color: "#fff",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <main
          role="alert"
          aria-live="assertive"
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            boxSizing: "border-box",
            textAlign: "center",
          }}
        >
          <section style={{
            width: "100%",
            maxWidth: "560px",
            padding: "44px 28px",
            border: "1px solid rgba(255,255,255,.12)",
            borderRadius: "28px",
            background: "rgba(255,255,255,.06)",
            boxSizing: "border-box",
          }}>
            <p style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "4px", color: "#a5b4fc" }}>
              INVENTORY SYSTEM
            </p>
            <h1 style={{ margin: "16px 0", fontSize: "clamp(28px, 5vw, 40px)" }}>
              Site Under Maintenance
            </h1>
            <p style={{ color: "#cbd5e1", lineHeight: 1.7 }}>
              We’re experiencing a temporary technical issue. The site is temporarily unavailable.
              Please try again shortly.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: "20px",
                border: 0,
                borderRadius: "12px",
                padding: "12px 24px",
                color: "#fff",
                background: "#6366f1",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
