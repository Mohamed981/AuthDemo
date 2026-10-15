# AuthDemo

Sign up / sign in module built with **NestJS + MongoDB** (backend) and **React + TypeScript + Vite** (frontend).

```
backend/    NestJS API (Mongoose, JWT in httpOnly cookie, argon2 password hashing)
frontend/   React SPA (React Router, React Hook Form, Zod)
docker-compose.yml        Local MongoDB
Dockerfile                Single-container image (API + SPA) — see Live deployment
render.yaml               Render service definition
docker-compose.prod.yml   Production images (API + nginx web) — see Production deployment
.github/workflows/        CI/CD pipeline — see CI/CD
```

## Prerequisites

- Node.js 22+ and npm 10+
- Docker (for local MongoDB), or any MongoDB 6+ instance

## Getting started

```bash
npm install                                  # installs both workspaces
cp backend/.env.example backend/.env         # then set JWT_SECRET (32+ chars)
npm run db:up                                # starts MongoDB on localhost:27017
npm run dev                                  # API on :3000, web on :5173
```

Open http://localhost:5173. The Vite dev server proxies `/api` to the backend, so the auth cookie is same-origin.

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Scripts (from the repo root)

| Command | What it does |
|---|---|
| `npm run dev` | Run backend (watch mode) and frontend together |
| `npm run build` | Production build of both apps |
| `npm test` | Backend unit tests |
| `npm run db:up` / `db:down` | Start / stop local MongoDB |

Per-app scripts are available with `-w backend` / `-w frontend`, e.g. `npm run typecheck -w frontend`.

## API

### Overview

| | |
|---|---|
| Base URL | `http://localhost:3000/api` (direct) or `http://localhost:5173/api` (through the Vite dev proxy) |
| Format | JSON request and response bodies; send `Content-Type: application/json` |
| Max body size | 10 KB |
| Authentication | `access_token` cookie (JWT), set by sign-up / sign-in — see [Authentication](#authentication) |

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | [`/auth/signup`](#post-authsignup) | – | Create an account and start a session |
| POST | [`/auth/signin`](#post-authsignin) | – | Sign in and start a session |
| POST | [`/auth/signout`](#post-authsignout) | – | End the session |
| GET | [`/auth/session`](#get-authsession) | – | Current user, or `null` when signed out |
| GET | [`/auth/me`](#get-authme) | **required** | Current user (protected) |
| GET | `/health` | – | `200 {"status":"ok","database":"up","version":"<commit>"}`, or `503` when MongoDB is unreachable. Not rate limited; used by container healthchecks and the deploy job. |

### Authentication

Sign-up and sign-in set an `access_token` cookie holding a signed JWT:

```
Set-Cookie: access_token=<jwt>; Max-Age=3600; Path=/; HttpOnly; SameSite=Strict
```

- **HttpOnly** — not readable from JavaScript; the browser sends it automatically.
- **SameSite=Strict** — only sent on same-site requests, so the frontend must be served from the same site as the API (the Vite proxy does this locally).
- **Secure** — added when `NODE_ENV=production` (HTTPS only).
- **Lifetime** — `JWT_EXPIRES_IN` seconds (default 3600). There is no refresh; the user signs in again after expiry.

With `fetch`, use `credentials: 'same-origin'` (or `'include'` cross-origin). With curl, keep cookies in a jar: `-c cookies.txt` to save, `-b cookies.txt` to send.

### Data types

**User** — returned by every endpoint that returns an account. The password hash is never included.

```json
{ "id": "6ad0c01c41bb58476a918f46", "email": "jane@example.com", "name": "Jane Doe" }
```

| Field | Type | Notes |
|---|---|---|
| `id` | string | MongoDB ObjectId |
| `email` | string | Stored lowercase, trimmed |
| `name` | string | Trimmed |

### Endpoints

#### `POST /auth/signup`

Creates an account and signs the user in.

**Request body**

| Field | Type | Rules |
|---|---|---|
| `email` | string | Valid email address. Trimmed and lowercased before validation and storage. |
| `name` | string | 3–100 characters after trimming |
| `password` | string | 8–128 characters, with at least one letter, one number and one special character (anything that is not a letter or digit) |

Unknown fields are rejected (`property <name> should not exist`).

```bash
curl -i -c cookies.txt -X POST http://localhost:3000/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"jane@example.com","name":"Jane Doe","password":"secret12!"}'
```

**`201 Created`** — sets the `access_token` cookie.

```json
{ "user": { "id": "6ad0c01c41bb58476a918f46", "email": "jane@example.com", "name": "Jane Doe" } }
```

**Errors**

| Status | When | Example `message` |
|---|---|---|
| `400` | Validation failed | `["Email must be a valid email address", "Name must be at least 3 characters", "Password must be at least 8 characters"]` |
| `409` | Email already registered | `"An account with this email already exists"` |
| `429` | Rate limit exceeded | `"Too many requests, please try again later"` |

All validation messages (several can be returned at once):

| Field | Messages |
|---|---|
| `email` | `Email must be a valid email address` |
| `name` | `Name must be a string` · `Name must be at least 3 characters` · `Name must be at most 100 characters` |
| `password` | `Password must be a string` · `Password must be at least 8 characters` · `Password must be at most 128 characters` · `Password must contain at least one letter, one number and one special character` |

#### `POST /auth/signin`

Signs in with email and password.

**Request body**

| Field | Type | Rules |
|---|---|---|
| `email` | string | Valid email address (trimmed, lowercased) |
| `password` | string | Required, at most 128 characters. The strength rules are not re-checked here. |

```bash
curl -i -c cookies.txt -X POST http://localhost:3000/api/auth/signin \
  -H 'Content-Type: application/json' \
  -d '{"email":"jane@example.com","password":"secret12!"}'
```

**`200 OK`** — sets the `access_token` cookie.

```json
{ "user": { "id": "6ad0c01c41bb58476a918f46", "email": "jane@example.com", "name": "Jane Doe" } }
```

**Errors**

| Status | When | Example `message` |
|---|---|---|
| `400` | Validation failed | `["Email must be a valid email address", "Password is required"]` |
| `401` | Wrong email or password | `"Invalid email or password"` |
| `429` | Rate limit exceeded | `"Too many requests, please try again later"` |

An unknown email and a wrong password return the same `401`, with the same response time, so the endpoint cannot be used to find out which emails are registered.

#### `POST /auth/signout`

Clears the session cookie. Works whether or not the user is signed in.

```bash
curl -i -b cookies.txt -X POST http://localhost:3000/api/auth/signout
```

**`204 No Content`** — no body.

```
Set-Cookie: access_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict
```

The JWT itself stays valid until it expires; signing out removes it from the browser.

#### `GET /auth/session`

Returns the signed-in user, or `null`. Never returns `401`, so it is the endpoint to call on page load to find out whether anyone is signed in.

```bash
curl -b cookies.txt http://localhost:3000/api/auth/session
```

**`200 OK`** — signed in:

```json
{ "user": { "id": "6ad0c01c41bb58476a918f46", "email": "jane@example.com", "name": "Jane Doe" } }
```

**`200 OK`** — no cookie, or an invalid or expired token:

```json
{ "user": null }
```

#### `GET /auth/me`

**Protected.** Returns the signed-in user; requires a valid `access_token` cookie.

```bash
curl -b cookies.txt http://localhost:3000/api/auth/me
```

**`200 OK`**

```json
{ "user": { "id": "6ad0c01c41bb58476a918f46", "email": "jane@example.com", "name": "Jane Doe" } }
```

**Errors**

| Status | When | Example `message` |
|---|---|---|
| `401` | No cookie, an invalid or expired token, or the account no longer exists | `"Unauthorized"` |

### Errors

Every error response has the same shape:

```json
{
  "statusCode": 400,
  "message": ["Email must be a valid email address", "Password is required"],
  "error": "Bad Request",
  "requestId": "362e133b-cef8-4aaa-8c95-86d6f4b038a7"
}
```

| Field | Type | Notes |
|---|---|---|
| `statusCode` | number | Same as the HTTP status |
| `message` | string \| string[] | An array for validation errors (one entry per failed rule), otherwise a string. Safe to show to users. |
| `error` | string | HTTP status text, e.g. `Bad Request`, `Unauthorized` |
| `requestId` | string | Matches the `X-Request-Id` header and the server log lines for this request |

Status codes used by the API:

| Status | Meaning |
|---|---|
| `400 Bad Request` | Validation failed, unknown fields, or malformed JSON |
| `401 Unauthorized` | Wrong credentials (sign-in) or missing/invalid session (`/auth/me`) |
| `404 Not Found` | Unknown route, e.g. `"Cannot GET /api/nope"` |
| `409 Conflict` | Email already registered |
| `413 Payload Too Large` | Request body over 10 KB |
| `429 Too Many Requests` | Rate limit exceeded; see `Retry-After` |
| `500 Internal Server Error` | Unexpected failure. The message is always the generic `"Internal server error"`; details are only in the server log, findable by `requestId`. |

### Rate limits

Limits are per client IP, counted over a 60-second window.

| Scope | Limit |
|---|---|
| `POST /auth/signup`, `POST /auth/signin` | 10 requests per minute |
| All other routes | 100 requests per minute |

Responses carry `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset` (seconds). Over the limit, the API returns `429` with a `Retry-After` header in seconds.

### Request IDs

Every response has an `X-Request-Id` header, also included as `requestId` in error bodies and in each server log line. To correlate with an upstream proxy or client, send your own `X-Request-Id` (1–64 letters, digits, `_` or `-`); otherwise the server generates a UUID.

## Error handling & logging

- **Backend** — `AllExceptionsFilter` (`backend/src/common/filters`) shapes every error. 4xx are logged as one-line warnings; anything else is logged with its stack trace and returned as a generic `500 Internal server error`, so internals never reach the client. Each request gets an access-log line with status, duration and request ID. Unhandled rejections, uncaught exceptions and startup failures are logged too. Logs are plain text in development and JSON (one object per line) when `NODE_ENV=production`.
- **Frontend** — network failures and 5xx responses show a friendly message (5xx include the request ID as a reference for support); a top-level error boundary replaces a crashed render with a reload screen. Unexpected errors go through `reportError` (`frontend/src/lib/reportError.ts`), the single place to plug in an error tracker such as Sentry.

## Configuration

Backend environment variables (validated at startup — the app refuses to boot with invalid config):

| Variable | Default | Notes |
|---|---|---|
| `NODE_ENV` | `development` | `production` enables the `Secure` cookie flag |
| `PORT` | `3000` | |
| `MONGODB_URI` | – | Required |
| `JWT_SECRET` | – | Required, ≥ 32 characters |
| `JWT_EXPIRES_IN` | `3600` | Token / cookie lifetime in seconds |
| `CORS_ORIGIN` | `http://localhost:5173` | Only relevant when the SPA is served from another origin |
| `TRUST_PROXY` | `0` | Number of reverse proxies in front of the API (`1` behind the nginx image or Render). Needed so rate limiting sees real client IPs. |
| `STATIC_DIR` | – | Directory of the built frontend. When set, the API also serves the SPA (set by the root `Dockerfile`). |

## Security notes

- Passwords hashed with **argon2id**; the hash is excluded from queries by default.
- The JWT lives in an **httpOnly, SameSite=Strict** cookie (Secure in production), so it is not readable from JS.
- Sign-in returns the same error for unknown email and wrong password, and does a dummy hash verification for unknown emails to keep timing uniform.
- Rate limiting: 100 req/min globally, 10 req/min on sign-up and sign-in.
- `helmet` security headers; request bodies are whitelisted (unknown fields are rejected).

## Production deployment (Docker)

Three images, all built from the repository root:

| Image | Dockerfile | Contents |
|---|---|---|
| `app` | `Dockerfile` | **Single container**: the API also serves the built SPA (`STATIC_DIR`), so the whole app is one service on one URL. Used for the [live deployment](#live-deployment-render). |
| `api` | `backend/Dockerfile` | Compiled NestJS app on Node 22, production dependencies only, runs as the non-root `node` user on port 3000. Healthcheck: `GET /api/health`. |
| `web` | `frontend/Dockerfile` | The built SPA served by nginx on port 80. Proxies `/api` to `API_UPSTREAM` (default `http://api:3000`) so the session cookie stays same-origin. Hashed assets are cached for a year, `index.html` never. |

Run the single container locally:

```bash
docker build -t authdemo-app .
docker run --rm --env-file backend/.env -e NODE_ENV=production -p 8080:3000 authdemo-app   # http://localhost:8080
```

Or the `api` + `web` pair:

```bash
docker compose -f docker-compose.prod.yml up --build     # http://localhost:8080, MongoDB from backend/.env
docker compose -f docker-compose.prod.yml down
```

The compose file sets `NODE_ENV=production` (JSON logs, `Secure` cookie) and `TRUST_PROXY=1`. On any other host, run the two images on one network, pass the backend variables from [Configuration](#configuration) to `api`, and put HTTPS in front of `web`: in production the session cookie is `Secure` and is only sent over HTTPS (browsers make an exception for `localhost`).

Without Docker: serve `frontend/dist` and the API under the same site (a reverse proxy routing `/api` to the Nest app), set `TRUST_PROXY`, and run `NODE_ENV=production npm run start:prod -w backend`.

## CI/CD

GitHub Actions, in `.github/workflows/ci-cd.yml`:

| Trigger | `verify` job | `deploy` job (after `verify`) | `images` job (after `verify`) |
|---|---|---|---|
| Pull request | `npm ci`, typecheck both apps, unit tests, build | – | Builds all three images to check the Dockerfiles (not pushed) |
| Push to `main` | same | Deploys to Render and waits until the new commit is live ([setup](#live-deployment-render)) | Builds and pushes to GHCR, tagged `latest` and `sha-<commit>` |
| Tag `v1.2.3` | same | – | Builds and pushes, tagged `1.2.3` and `sha-<commit>` |

Images are published as `ghcr.io/<owner>/<repo>-app`, `-api` and `-web`. Publishing uses the workflow's built-in `GITHUB_TOKEN`, so no secrets need to be configured. New packages are private by default; change that under the package's settings on GitHub if needed.

To run the published images:

```bash
API_IMAGE=ghcr.io/<owner>/<repo>-api:latest \
WEB_IMAGE=ghcr.io/<owner>/<repo>-web:latest \
docker compose -f docker-compose.prod.yml up
```

Recommended repository settings: protect `main` and require the **Typecheck, test & build** check before merging. Dependabot (`.github/dependabot.yml`) opens weekly update PRs for npm packages, GitHub Actions and the Docker base images.

> If a push fails with `denied: permission_denied: read_package`, a package with that name already exists but belongs to another (e.g. deleted) repository. Delete the package on GitHub, or grant this repository **Write** under the package's *Manage Actions access*, then re-run the job.

## Live deployment (Render)

The app runs on [Render](https://render.com) as one web service built from the root `Dockerfile`. GitHub Actions deploys it after CI passes on `main`; the live URL is shown on each workflow run and under the repository's **Environments → production**.

### One-time setup

1. **MongoDB access** — Render's outgoing IPs are not fixed, so in MongoDB Atlas → *Network Access* allow `0.0.0.0/0` (access stays protected by the database user's password).
2. **Create the service** — in the Render dashboard choose **New → Blueprint**, connect this GitHub repository and apply `render.yaml`. When prompted, paste your Atlas connection string as `MONGODB_URI`. `JWT_SECRET` is generated automatically; `NODE_ENV=production` and `TRUST_PROXY=1` are preset.
3. **Get the URL and deploy hook** — open the new `authdemo` service. Copy its URL (e.g. `https://authdemo-xxxx.onrender.com`) and, under **Settings → Deploy Hook**, copy the hook URL.
4. **Configure GitHub** — in the repository, **Settings → Secrets and variables → Actions**:
   - **Secrets** tab: add `RENDER_DEPLOY_HOOK_URL` with the deploy hook URL.
   - **Variables** tab: add `APP_URL` with the service URL (no trailing slash).
5. Push to `main` (or re-run the latest workflow). The **Deploy to Render** job triggers the deploy and waits until `GET /api/health` reports the pushed commit.

Until `APP_URL` is set, the deploy job is skipped and the rest of the pipeline runs as usual. Auto-deploy is off in `render.yaml` so Render only deploys commits that passed CI.

### Free plan notes

- The service sleeps after about 15 minutes without traffic; the first request afterwards takes up to a minute while it starts.
- Rate-limit counters are kept in memory, so they reset on restart and apply per instance.
