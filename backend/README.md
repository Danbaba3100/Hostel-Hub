# Hostel Hub Backend

Node.js + Express + PostgreSQL API for the existing Hostel Hub static frontend. The current frontend pages are intentionally left unchanged while the backend foundation is established.

## Requirements

- Node.js 20 or newer
- PostgreSQL 14 or newer
- npm

## Live deployment

- Public website: `https://hostel-hub-frontend.onrender.com`
- API health endpoint: `https://hostel-hub-api-a4ie.onrender.com/api/health`
- Production API and database run on Render and Neon; end users do not need Node.js, PostgreSQL, or a local server on their computers.
- Set production environment variables and secrets in Render. Do not commit real credentials or connect production to a personal computer.
- The Render build command applies the SQL migrations before starting the API.
- Local development and automated tests are separate from the live deployment.

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
