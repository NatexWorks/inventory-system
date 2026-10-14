# Email OTP setup

The app sends one-time verification codes for new account registration and password recovery through SMTP using Nodemailer.

## Environment variables

Configure these as server-side environment variables in the deployment platform and redeploy:

- `SMTP_HOST`: SMTP server hostname from your email provider.
- `SMTP_PORT`: usually `587` for STARTTLS or `465` for implicit TLS, as provided by your email host.
- `SMTP_USER`: SMTP login username.
- `SMTP_PASS`: SMTP password or provider-issued app password.
- `SMTP_FROM`: sender address authorized by your email provider.
- `JWT_SECRET`: random server-only secret of at least 32 characters.
- `OTP_SECRET`: optional, separate random server-only secret of at least 32 characters used to hash OTPs. If omitted, OTP hashing uses `JWT_SECRET`.

Set the sender address to one the SMTP provider permits. Do not prefix the secret variables with `NEXT_PUBLIC_`.

## How OTPs behave

- Codes are six digits, expire after 10 minutes, and can be consumed only once.
- A code is stored as an HMAC hash, not as plaintext.
- Incorrect guesses are limited to five attempts.
- Resending is throttled to one request per 60 seconds and five requests per 15-minute window per email and purpose.
- Password-reset requests use a generic response to avoid revealing whether an account exists.
- Legacy password reset links already issued remain valid until their existing expiration.

## Local automated tests

Playwright enables `OTP_DEV_RETURN_CODE=true` only for its local development server so the test suite can obtain a test code without a real SMTP account. The server code never returns OTPs when `NODE_ENV=production`. Do not set `OTP_DEV_RETURN_CODE` in Vercel or another production environment.

Email delivery will return an error until the SMTP environment variables are configured correctly.
