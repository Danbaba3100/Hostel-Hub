# Hostel Hub Agent Dashboard API

This stage connects the existing agent dashboard to the Node.js/Express API and PostgreSQL database.

## Live deployment

- Public website: `https://hostel-hub-frontend.onrender.com`
- API: `https://hostel-hub-api-a4ie.onrender.com/api`
- The deployed frontend uses the live API; visitors and agents do not need a local server running on a personal computer.
- Configure `DATABASE_URL`, `DATABASE_SSL`, `JWT_SECRET`, `CORS_ORIGINS`, and `FRONTEND_BASE_URL` in Render's environment settings. Keep credentials out of GitHub.
- Backend code changes deploy through the connected Render service. Run database migrations through the configured Render build command.
- For local development only, use an isolated development environment and never point production data at a local database.

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
