# Feature Tracker API

A minimal Node.js 18+ REST API using Express and PostgreSQL. Tables are created automatically when the server starts.

## Local run

1. Install Node.js 18 or newer and have a PostgreSQL database available.
2. From this folder, run:

   ```sh
   npm install
   ```

3. Copy `.env.example` to `.env`, then set `DATABASE_URL` and a long random `JWT_SECRET`. `ADMIN_EMAIL` and `ADMIN_PASSWORD` seed the first admin only when the users table is empty.
4. Start in development:

   ```sh
   npm run dev
   ```

The API listens on `0.0.0.0` and defaults to port `3000`.

## Render deploy

1. Create a Render Web Service from this folder/repository.
2. Set **Build Command** to `npm install`.
3. Set **Start Command** to `npm start`.
4. Set **Health Check Path** to `/health`.
5. Configure `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optionally `PORT` and `KEEP_ALIVE`. Use a managed PostgreSQL URL and a unique, long random JWT secret.

The built-in keep-alive only works while the service is awake. Configure an external pinger such as UptimeRobot or cron-job.org to request `/health` every 5–10 minutes so a sleeping free service receives inbound traffic.

## Feature fields and migration

The feature API accepts `name`, `dev`, `test`, `dep`, `by`, `clinic`, `cred`,
`lead`, `inf`, `notes`, `deadline`, and `priority`. The `by` field is stored in
the `requested_by` database column. `deadline` is a valid `YYYY-MM-DD` date or
`null`; `priority` is `Normal` or `High` and defaults to `Normal`.

On startup, the API adds the two new columns with `ADD COLUMN IF NOT EXISTS`.
This is safe to run on existing databases and preserves rows that have no
deadline.

## Optional Groq smart parsing

The app's rule-based Quick add works without AI. To enable optional AI parsing
on Render, add `GROQ_API_KEY` to the API service environment and optionally set
`GROQ_MODEL` (defaults to `llama-3.1-8b-instant`). The API reports availability
through `GET /api/config`; AI requests require a JWT and are limited to 20 per
user per minute. Do not configure Groq credentials in the frontend.

## API examples

Set the API URL and replace the example credentials as needed:

```sh
export API_URL=http://localhost:3000
```

Health check (no authentication):

```sh
curl "$API_URL/health"
```

Log in and capture the JWT:

```sh
TOKEN=$(curl -sS -X POST "$API_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"change-me-please"}' | jq -r .token)
```

Create, list, patch, and delete a feature:

```sh
FEATURE_ID=$(curl -sS -X POST "$API_URL/api/features" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Appointment reminders"}' | jq -r .id)

curl -sS "$API_URL/api/features" -H "Authorization: Bearer $TOKEN"

curl -sS -X PATCH "$API_URL/api/features/$FEATURE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"by":"Dr Rao","dev":"Done"}'

curl -i -X DELETE "$API_URL/api/features/$FEATURE_ID" \
  -H "Authorization: Bearer $TOKEN"
```

The feature API returns the same feature fields plus `id` and `created`. The
unauthenticated keep-alive endpoint remains available at `/health`.
