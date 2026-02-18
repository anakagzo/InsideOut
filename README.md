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
- Node.js 18+ (or Bun)
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
