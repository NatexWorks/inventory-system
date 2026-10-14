import nodemailer from "nodemailer";

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !pass || !from) {
    throw new Error("Email delivery is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.");
  }

  return { host, port, user, pass, from };
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

export async function sendOtpEmail({ to, name = "", otp, purpose }) {
  const config = getSmtpConfig();
  const isSignup = purpose === "signup";
  const action = isSignup ? "verify your email address" : "reset your password";
  const subject = isSignup
    ? "Your Inventory System verification code"
    : "Your Inventory System password reset code";
  const safeName = escapeHtml(name || "there");
  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f1f5f9;padding:32px 12px;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;padding:32px">
      <p style="margin:0;color:#4f46e5;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase">Inventory System</p>
      <h1 style="font-size:24px;margin:18px 0 12px">Your verification code</h1>
      <p style="font-size:15px;line-height:1.6;color:#475569">Hi ${safeName}, use this one-time code to ${action}.</p>
      <div style="margin:26px 0;padding:18px;background:#eef2ff;border-radius:14px;text-align:center;font-size:32px;letter-spacing:9px;font-weight:bold;color:#3730a3">${otp}</div>
      <p style="font-size:14px;line-height:1.6;color:#475569">This code expires in 10 minutes and can be used only once. Never share it with anyone.</p>
      <p style="font-size:12px;line-height:1.6;color:#94a3b8">If you did not request this code, you can safely ignore this email.</p>
    </div>
  </body>
</html>`;
  const text = `Hi ${name || "there"},\n\nUse this one-time code to ${action}: ${otp}\n\nIt expires in 10 minutes and can be used only once. Never share it with anyone. If you did not request it, ignore this email.`;

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.pass },
    });

    await transporter.sendMail({
      from: config.from,
      to,
      subject,
      text,
      html,
    });
  } catch (error) {
    // Keep SMTP details out of the API response; never log the one-time code.
    console.error("OTP email delivery failed:", error?.message || "unknown SMTP error");
    const deliveryError = new Error("The email could not be sent. Check SMTP settings and try again.");
    deliveryError.status = 503;
    throw deliveryError;
  }
}
