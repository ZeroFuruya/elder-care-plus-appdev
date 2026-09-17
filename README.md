# Elder Care+

A mobile caregiver dashboard created with Expo React Native, TypeScript, and Supabase.

## Quick setup

1. In Supabase, open **SQL Editor**, paste and run [`supabase/schema.sql`](./supabase/schema.sql).
2. In **Authentication > Providers > Email**, temporarily turn off **Confirm email** so registration is immediately usable during the presentation.
3. Copy `.env.example` to a new `.env` file and add the Project URL and **publishable/anon key** from **Connect**. Never add a `service_role` key.
4. Run `npm start`, then scan the QR code in Expo Go.
5. Register a demo account, for example:
   - Username: `caregiver.demo`
   - Email: `caregiver@eldercareplus.app`
   - Password: `Demo123!`

The app supports signing in with either `caregiver.demo` or the account email.

## Included submission features

- Cloud-backed registration and login through Supabase Auth
- User profile row stored in Supabase PostgreSQL
- Empty-form, unknown-account, incorrect-password, and success messages
- Show/hide password, password rules, loading states, and session persistence
- Dashboard with Elder Care+ sample care data
- Confirmation dialog before sign-out
