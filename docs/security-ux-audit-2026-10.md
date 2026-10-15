# Inventory System: Code-Level Security and UX Audit

**Review date:** 15 October 2026  
**Scope:** Authentication and OTP flows, API route handlers, tenant scoping in data services, Mongoose schemas, deployment config, and consumer-facing routes. This is a source-code review, not an external penetration test; the live Vercel deployment and its database/SMTP configuration were not verified from this review.

## Changes made in this branch

- **Demo data isolation:** the seed script no longer attaches sample records to the oldest active customer. It creates a dedicated `demo@inventory-system.test` user and scopes sample categories, products, settings, and orders to that user's ID.
- **Read-only demo:** the server rejects authenticated non-read requests from an account marked `isDemo`. The banner explains that demo mode is read-only. UI-only disabling is not the security control; the server check is.
- **Persistent authentication throttling:** rate-limit buckets now use atomic MongoDB updates with TTL expiry, instead of an in-process Map that would reset between serverless instances. The bucket keys are hashes, and login/signup are throttled by both email and client IP.
- **Session revocation:** password reset and password change increment a per-user token version. Previously issued JWTs are rejected on the next protected request; after changing a password, the current session is reissued and other sessions are invalidated.
- **Error and configuration handling:** duplicate-key responses no longer include raw MongoDB error details. A missing production `MONGODB_URI` fails as a server configuration error instead of silently trying localhost. The session-check route no longer disguises infrastructure failures as ordinary logouts.
- **Response hardening:** added clickjacking, MIME-sniffing, referrer, camera/microphone/geolocation, and HSTS headers.
- **UX corrections:** removed the redirect that made the existing `/pos` page inaccessible, and clearly labelled the supplier list as illustrative sample data. Supplier search now filters the displayed rows and the sample metrics match those rows.
- **Password handling:** new passwords are limited to 72 UTF-8 bytes to avoid bcrypt's 72-byte truncation issue.

## Findings that still require product decisions or live verification

### High priority

1. **Forgot-password account enumeration (intentional trade-off).** The recovery flow deliberately tells a visitor whether an email exists and redirects unknown addresses to signup. This meets the requested customer journey, but an attacker can use it to test email lists. A privacy-first flow should show the same generic response for known and unknown addresses.
2. **Demo credentials are public by design.** Treat them as published credentials, not secrets. Run `npm run seed:demo` once against the same database used by Production before advertising the login. Keep all demo records under the demo user's ID. Any future write API must call `assertAuth`/the same demo guard; do not create unguarded mutating routes.
3. **Production release still needs live verification.** Confirm Vercel has `MONGODB_URI`, `JWT_SECRET` (random, server-only, at least 32 characters), `OTP_SECRET` (optional, server-only, at least 32 characters), and valid `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. Confirm a real OTP arrives and that signup/reset codes expire and are single-use. Source changes alone do not prove the running deployment has updated.

### Medium priority

4. **Account email changes are not re-verified.** The profile update endpoint can change the account email while leaving `emailVerified` unchanged. Add a dedicated email-change OTP/confirmation flow before relying on this field for verified contact details or security notifications.
5. **Supplier functionality is a prototype.** The page still uses illustrative hard-coded suppliers; it is now labelled honestly, but does not yet persist supplier records per workspace.
6. **QR/session destination needs a route check.** Session creation builds QR URLs for `/sessions/<sessionId>`, but the current App Router tree does not contain a matching `/sessions/[sessionId]` page. Verify the intended customer-device flow or implement that route before using QR sessions in production.
7. **Realtime events are process-local.** The current event bus uses Node's in-process `EventEmitter`. It will not reliably broadcast between different Vercel serverless instances; use a managed pub/sub or hosted realtime service if cross-device live updates are a product requirement.
8. **Email delivery and recovery need live tests.** SMTP credentials, Gmail/Brevo policy, sender acceptance, spam placement, and provider quotas cannot be proven by lint/build. Exercise signup, resend cooldown, wrong-code attempts, expiry, password reset, and delivery failure in Production with a test mailbox.

### Lower priority / ongoing hardening

9. **Content Security Policy is not enabled.** The added headers cover several baseline controls, but a tailored CSP should be designed and tested with Next.js runtime scripts, styles, camera scanning, and any future third-party assets rather than applying an untested policy.
10. **No independent security test has been performed.** Before real customer data is stored, test object-level authorization across every ID-based endpoint, cross-tenant access, duplicate/parallel stock operations, request size limits, session expiry, and dependency advisories. The existing Playwright checks cover a subset of these cases.
11. **Staff-account lifecycle is incomplete.** Public signup correctly creates an owner; staff role assignment needs a deliberate owner-authorized invitation/provisioning flow if multi-user workspaces are required.

## Demo account setup

- Email: `demo@inventory-system.test`
- Password: `Demo@12345`
- Mode: read-only
- Initial demo dataset: 4 categories, 8 products, and 2 sample completed orders.

The `.test` address is deliberately non-deliverable. Do not use it as a real customer contact address. Keep `MONGODB_URI` out of source control and run the seed command only after checking which database it targets.
