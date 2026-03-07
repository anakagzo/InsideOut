# InsideOut

InsideOut is a full-stack e-learning platform with a Flask REST API backend and a React + Vite frontend.

## Project structure

- `backend/` — Flask API, SQLAlchemy models, JWT auth, pytest test suite
- `frontend/` — React/TypeScript SPA with Vite, Tailwind, and shadcn/ui components

## Tech stack

### Backend

- Flask
- Flask-Smorest
- Flask-JWT-Extended
- Flask-SQLAlchemy + Flask-Migrate
- Marshmallow
- Pytest

### Frontend

- React 18 + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui + Radix UI
- Vitest

## Prerequisites

- Python 3.11+ (3.12 recommended)
- Node.js 20.9.x (or Bun)
- Git

## Quick start

## 1) Clone and open

```bash
git clone <your-repo-url>
cd InsideOut
```

## 2) Backend setup

```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
```

Create your environment file:

```bash
# from backend/
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux
```

Run database migrations (if needed):

```bash
flask db upgrade
```

Seed initial admin user (backend-only):

```bash
# PowerShell example
$env:SEED_ADMIN_EMAIL="admin@insideout.local"
$env:SEED_ADMIN_PASSWORD="ChangeThisStrongPassword!"
flask seed-admin
```

Optional password rotation for an existing admin:

```bash
flask seed-admin --email admin@insideout.local --password "NewStrongPassword!" --rotate-password
```

Start backend server:

```bash
flask run
```

Backend default URL: `http://127.0.0.1:5000`

Swagger docs: `http://127.0.0.1:5000/swagger-ui`

## 3) Frontend setup

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend default URL: `http://127.0.0.1:8080`

## Environment variables (backend)

Core settings from `.env.example`:

- `APP_ENV` — `development` or `production`
- `DATABASE_URL` — SQLAlchemy DB URL (defaults to SQLite)
- `JWT_SECRET_KEY` — secret used to sign JWTs
- `PASSWORD_HASH_ROUNDS` — PBKDF2 iteration count for newly hashed passwords
- `PASSWORD_HASH_SALT_SIZE` — PBKDF2 salt size for newly hashed passwords
- `MEDIA_STORAGE_DRIVER` — `local` or cloud-compatible value
- `MEDIA_LOCAL_UPLOAD_DIR` — local upload folder
- `MEDIA_BASE_URL` — URL prefix for local media
- `DEFAULT_COURSE_IMAGE_URL` — fallback course image URL
- `MAX_MEDIA_UPLOAD_MB` — upload limit in MB

Cloud media settings (optional):

- `MEDIA_PUBLIC_BASE_URL`
- `MEDIA_BUCKET_NAME`
- `MEDIA_S3_REGION`
- `MEDIA_S3_ENDPOINT_URL`
- `MEDIA_S3_ACCESS_KEY`
- `MEDIA_S3_SECRET_KEY`

Logging settings:

- `LOG_LEVEL` — e.g. `DEBUG`, `INFO`, `WARNING`
- `LOG_FORMAT` — Python logging format string
- `LOG_DATE_FORMAT` — date/time format in logs

Payments / onboarding settings:

- `STRIPE_SECRET_KEY` — Stripe secret key used by backend payment endpoints
- `STRIPE_PUBLISHABLE_KEY` — Stripe publishable key returned with checkout session
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret for `/payments/stripe/webhook`
- `STRIPE_CURRENCY` — checkout currency (default `gbp`)
- `FRONTEND_BASE_URL` — frontend origin for Stripe success/cancel redirects
- `ONBOARDING_TOKEN_SECRET` — signing secret for server-issued onboarding links
- `ONBOARDING_TOKEN_TTL_SECONDS` — onboarding link validity window in seconds

Admin seeding settings (backend-only CLI):

- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `SEED_ADMIN_FIRST_NAME`
- `SEED_ADMIN_LAST_NAME`
- `SEED_ADMIN_PHONE_NUMBER`
- `SEED_ADMIN_OCCUPATION`

### Admin seeding

- Use `flask seed-admin` from backend terminal only; do not expose admin creation in frontend.
- Prefer one-time shell environment variables over committing values to `.env`.
- Rotate the seeded admin password immediately after first login (or use `--rotate-password`).

Safe PowerShell example (session-only variables):

```powershell
$env:SEED_ADMIN_EMAIL = "admin@insideout.local"
$env:SEED_ADMIN_PASSWORD = "UseALongUniquePassphrase!"
flask seed-admin
Remove-Item Env:SEED_ADMIN_PASSWORD
```

## Stripe setup (checkout + webhook)

1. Create Stripe API keys in your Stripe dashboard.
2. Set `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` in `backend/.env`.
3. Run Stripe CLI webhook forwarding in a separate terminal:

```bash
stripe listen --forward-to http://127.0.0.1:5000/payments/stripe/webhook
```

4. Copy the CLI signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.
5. Restart backend after changing env vars.

Notes:

- Checkout creates a Stripe session via `POST /payments/stripe/create-checkout-session`.
- Enrollment + onboarding token finalization happens via:
	- `POST /payments/stripe/finalize` on success redirect, and
	- `POST /payments/stripe/webhook` for resilient server-side confirmation.

### Troubleshooting Stripe

- `Stripe is not configured` or `Stripe publishable key is not configured`
	- Confirm `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` are set in `backend/.env`.
	- Restart backend after changing env values.

- `Invalid webhook signature`
	- Make sure Stripe CLI is forwarding to `http://127.0.0.1:5000/payments/stripe/webhook`.
	- Copy the latest CLI signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.
	- Restart backend after updating the secret.

- Checkout succeeds but enrollment is missing
	- Verify frontend redirects back to `/checkout/:id?status=success&session_id=...`.
	- Confirm webhook forwarding is active so server-side fallback finalization can run.

- `You are already enrolled in this course`
	- The backend prevents duplicate active/completed enrollments.
	- Use account schedules/onboarding screen instead of re-checkout for that course.

### Stripe Production Checklist

- Use HTTPS for `FRONTEND_BASE_URL` and deploy backend behind HTTPS.
- Set strong production secrets for `JWT_SECRET_KEY` and `ONBOARDING_TOKEN_SECRET`.
- Use live Stripe keys (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`) only in production env.
- Register webhook endpoint in Stripe dashboard: `/payments/stripe/webhook`.
- Set `STRIPE_WEBHOOK_SECRET` from Stripe dashboard (or secure secret manager), then restart backend.
- Keep `ONBOARDING_TOKEN_TTL_SECONDS` short enough for security while supporting user flow.
- Monitor webhook delivery status in Stripe dashboard and backend logs.

## Testing

### Backend tests

```bash
cd backend
# activate venv first
python -m pytest
```

### Frontend tests

```bash
cd frontend
npm run test
```

## Common scripts

### Frontend (`frontend/package.json`)

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run preview` — preview built app
- `npm run lint` — run ESLint
- `npm run test` — run Vitest once
- `npm run test:watch` — run Vitest in watch mode

## API modules (backend/resources)

- `user.py` — auth, profile, admin user operations
- `course.py` — course CRUD, saved courses, user course schedules
- `enrollment.py` — enrollment CRUD + grouped schedules
- `schedule.py` — schedule creation and retrieval
- `availability.py` — admin availability management
- `review.py` — course reviews and tutor replies
- `notification.py` — email notification settings

## Notes

- The backend includes centralized logging configuration at startup.
- Endpoint and utility modules include module-level loggers for easier debugging.
- Tests are organized by feature area under `backend/tests/`.

## Deployment pointers

- Set `APP_ENV=production`
- Use a secure `JWT_SECRET_KEY`
- Configure a production database via `DATABASE_URL`
- Configure cloud media variables if not using local file storage
- Use Gunicorn (already included in requirements) behind a reverse proxy

## CI/CD (GitHub Actions + DigitalOcean)

This repository now includes:

- `.github/workflows/ci.yml` — runs backend tests and frontend lint/test/build on pushes and pull requests.
- `.github/workflows/deploy.yml` — deploys automatically to DigitalOcean App Platform after CI succeeds on `main`.
- `.do/app.yaml` — App Platform spec for monorepo deployment (`backend/` service + `frontend/` static site).

### Required GitHub repository secrets

Add these secrets in GitHub: **Settings → Secrets and variables → Actions**.

Core deployment secrets:

- `DIGITALOCEAN_ACCESS_TOKEN`
- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `ONBOARDING_TOKEN_SECRET`
- `FRONTEND_BASE_URL`
- `CORS_ORIGINS`
- `VITE_API_BASE_URL`
- `VITE_SITE_URL`

Optional feature secrets (enable related integrations):

- `MEDIA_PUBLIC_BASE_URL`
- `MEDIA_BUCKET_NAME`
- `MEDIA_S3_REGION`
- `MEDIA_S3_ENDPOINT_URL`
- `MEDIA_S3_ACCESS_KEY`
- `MEDIA_S3_SECRET_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `ZOOM_CLIENT_ID`
- `ZOOM_CLIENT_SECRET`
- `ZOOM_ACCOUNT_ID`
- `SENDGRID_API_KEY`
- `EMAIL_FROM`

### First deployment flow

1. Commit and push these workflow/spec files to `main`.
2. Add the required GitHub secrets listed above.
3. Push a new commit to `main` (or re-run the latest CI workflow).
4. GitHub Actions will run `CI`, then `Deploy`, and provision/update the app from `.do/app.yaml`.

### Scaling note

The backend currently runs an in-process APScheduler. Keep backend `instance_count: 1` unless scheduler jobs are moved to a dedicated worker process.
