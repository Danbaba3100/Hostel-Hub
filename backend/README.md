# Hostel Hub Backend

Node.js + Express + PostgreSQL API for the existing Hostel Hub static frontend. The current frontend pages are intentionally left unchanged while the backend foundation is established.

## Requirements

- Node.js 20 or newer
- PostgreSQL 14 or newer
- npm

## Local setup

From the repository root:

1. Create a PostgreSQL database named `hostel_hub`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` to your local database connection string.
3. Install dependencies: `cd backend && npm install`
4. Return to the repository root before running the backend, so dotenv loads the root `.env`.
5. Run migrations: `cd backend && npm run migrate`
6. Start the API: `npm run dev`
7. Check `http://localhost:4000/api/health`.

Example database creation command (run in a PostgreSQL terminal as a database administrator):

```sql
CREATE DATABASE hostel_hub;
```

## Phase 1 delivered

- Express server foundation
- Security headers with Helmet
- Explicit CORS allow-list
- JSON request-size limits
- API rate limiting
- Safe JSON error responses
- PostgreSQL connection pool
- Ordered, tracked SQL migrations
- Initial relational schema for agents/admins, video-only hostel listings, inspection requests, reports, and audit records
- Database-backed health endpoint

## Important security notes

- The migration creates no default admin or agent account. Accounts must be created through a future secure administrative provisioning/authentication flow.
- Never place real credentials in Git. Use environment variables or the hosting provider's secret manager.
- The schema stores video URLs only; it does not introduce photo upload fields.
- Inspection records and notification delivery status are separate so notification failures can be recorded without losing the booking.
- API routes for authentication, listings, inspections, reports, and dashboard summaries will be added in subsequent phases. They are not implemented by this foundation alone.

## Current endpoint

- `GET /api/health` — reports API status and checks database connectivity.
