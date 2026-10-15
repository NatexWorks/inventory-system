# Read-only demo account

The login and signup pages display a public demo account. Its credentials are intentionally public, so the account must never share a real customer's workspace.

## Credentials

- Email: `demo@inventory-system.test`
- Password: `Demo@12345`
- Access: read-only

The `.test` email domain is reserved for testing and is not a deliverable mailbox. Password reset/OTP email is not intended to work for this demo account.

## Initialize the demo workspace

1. Confirm that your local environment is pointing at the **same intended database** as the deployed app. Never paste database credentials into source files or commit them.
2. Put `MONGODB_URI` in your local `.env.local` (or provide it directly as a shell environment variable).
3. Run:

```bash
npm run seed:demo
```

The script creates/updates only the dedicated demo user, then inserts example records using that user's `userId`. It does not attach the sample data to the first or oldest active customer. Running it again rotates the demo user's token version so previous demo sessions become invalid.

## Important

The demo account is meant to be used as a product preview. The server blocks authenticated write methods for users marked `isDemo: true`, but every new protected mutating API must call the shared auth guard. Do not remove that guard or promote the demo user to a normal customer account.
