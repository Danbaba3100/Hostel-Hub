# Hostel Hub Agent Dashboard API

This stage connects the existing agent dashboard to the Node.js/Express API and PostgreSQL database.

## Local setup

1. Use Node.js 20 or newer.
2. Keep the local `.env` file in the repository root (one folder above `backend`). Never commit it.
3. Install dependencies from the `backend` folder with `npm install`.
4. Run database migrations from the `backend` folder with `npm run migrate`.
5. Start the API with `npm run dev` or `npm start`.
6. Serve the website through Live Server at an origin listed in `CORS_ORIGINS` in the root `.env`. The default example lists `http://127.0.0.1:5500` and `http://localhost:5500`.
7. Sign in through `login.html`. The dashboard requires a valid agent session.

## API routes

- `GET /api/hostels` — public approved, active listings.
- `GET /api/hostels/:slug` — one public approved listing.
- `POST /api/inspections` — submit a public inspection request without student registration.
- `GET /api/hostels/mine` — signed-in agent's own listings.
- `POST /api/hostels` — submit a video-only listing for admin approval.
- `PATCH /api/hostels/:id` — edit an owned listing; edits return to pending approval.
- `PATCH /api/hostels/:id/availability` — deactivate/reactivate an owned listing.
- `DELETE /api/hostels/:id` — soft-delete an owned listing.
- `GET /api/inspections/mine` — signed-in agent's inspection requests.
- `PATCH /api/inspections/:id/status` — update an owned inspection request.
- `GET /api/auth/me` — validate the current session.

Protected routes require `Authorization: Bearer <accessToken>`. Ownership is always checked on the server; an agent cannot choose another agent's ID.

## Video storage and WhatsApp

The listing form currently accepts a shareable video URL, because a real file upload requires a configured video-storage provider. The public inspection API stores requests in PostgreSQL, but automatic WhatsApp notifications require the WhatsApp provider credentials and a notification worker/integration. The agent dashboard's WhatsApp button opens a prefilled message to the student; it does not send messages automatically.

## Testing

From `backend`, run `npm test` after installing dependencies. Run `npm run migrate` before testing database-backed routes.
