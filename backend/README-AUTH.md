# Phase 2 — Authentication and Permissions

## Endpoints

- `POST /api/auth/register` — public registration creates **agent accounts only**.
- `POST /api/auth/login` — signs an agent or administrator in.
- `GET /api/auth/me` — returns the current active account; requires `Authorization: Bearer <accessToken>`.
- `GET /api/auth/profile` — returns the signed-in agent's profile fields; requires a bearer token.
- `PATCH /api/auth/profile` — validates and saves the signed-in agent's profile to PostgreSQL; agents can only edit their own profile.

Access tokens expire after 15 minutes by default. Configure `JWT_SECRET` as a random secret with at least 32 bytes. Keep it private and rotate it if exposed. Never commit it to Git.

## Agent registration request

```json
{
  "fullName": "Example Agent",
  "email": "agent@example.com",
  "phone": "+2348012345678",
  "password": "Use-A-Unique-Password-123"
}
```

Passwords must be 12–128 characters and contain uppercase, lowercase, and numeric characters. Passwords are hashed using bcrypt. Extra fields, including a requested role, are rejected. Public registration can never grant admin privileges.

## Provision the first admin

Only run this after PostgreSQL is configured and migrations have been applied. Set these variables in your local, uncommitted `.env` file:

- `CONFIRM_CREATE_ADMIN=YES`
- `ADMIN_FULL_NAME=...`
- `ADMIN_EMAIL=...`
- `ADMIN_PHONE=...` (optional)
- `ADMIN_PASSWORD=...`

Then run `npm run create-admin` from the `backend` directory. The script creates an admin only if the email is not already registered; it never changes an existing account's role or password. Remove the temporary admin variables after the command completes.

## Important

- A database connection and a configured `JWT_SECRET` are required for runtime authentication.
- Disabled accounts are rejected on every authenticated request.
- Role checks are provided by `requireRole('admin')` and `requireRole('agent')`; apply them to protected route handlers.
- Ownership checks for individual hostel and inspection records must be enforced in those resource endpoints (the next stage).
- No refresh-token or password-reset flow is included yet.
