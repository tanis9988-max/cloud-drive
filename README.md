# CloudDrive — Cloud File Storage Platform

A simplified Google Drive clone: upload, download, search, and share files,
with version history and a storage analytics dashboard. Built as a
full-stack portfolio project.

## Features

- **Auth** — register/login with JWT, passwords hashed with bcrypt
- **Upload / download** — any file type, up to 25MB by default
- **File sharing** — share a file with another user's email as view or edit
- **Version history** — upload a new version of a file without losing old ones,
  download any past version
- **Search** — filter your files (and files shared with you) by name
- **Storage analytics dashboard** — total files, total storage used, and a
  breakdown by file type

## Tech stack

| Layer      | Choice                                   |
|------------|-------------------------------------------|
| Frontend   | React (Vite), React Router                |
| Backend    | Node.js, Express                          |
| Database   | PostgreSQL                                |
| Storage    | Local disk by default, pluggable AWS S3   |
| Auth       | JWT                                       |
| Containers | Docker, docker-compose                    |
| Web server | Nginx (serves the built frontend, proxies `/api`) |
| CI         | GitHub Actions                            |
| Deploy target | AWS EC2                                |

## Architecture

```
Browser
   │
   ▼
Nginx (frontend container, port 8080)
   │  /api/*  → reverse-proxied
   ▼
Express API (backend container, port 5000)
   │
   ├── PostgreSQL (users, files, file_versions, shares)
   └── Storage layer (local disk, or AWS S3 when STORAGE_DRIVER=s3)
```

The storage layer is abstracted behind a single module
(`backend/src/utils/storage.js`) with two drivers: `local` (writes to disk —
zero setup, used by default so the project runs anywhere) and `s3` (writes
to a real AWS S3 bucket). Swapping drivers is a single environment variable;
no controller code changes.

## Running locally with Docker (recommended)

Requires Docker and Docker Compose.

```bash
git clone <this-repo>
cd clouddrive
docker compose up --build
```

- Frontend: http://localhost:8080
- Backend API: http://localhost:5000/api
- Postgres: localhost:5432 (user/pass/db: `clouddrive`)

The database schema is created automatically on backend startup.

## Running locally without Docker

**Backend**
```bash
cd backend
cp .env.example .env
npm install
# make sure PostgreSQL is running and DATABASE_URL in .env points to it
npm run dev
```

**Frontend**
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend runs on http://localhost:5173 and proxies `/api` to
http://localhost:5000 during development.

## Using real AWS S3 instead of local disk

1. Create an S3 bucket.
2. Create an IAM user/role with `s3:PutObject`, `s3:GetObject`,
   `s3:DeleteObject` on that bucket.
3. In `backend/.env`, set:
   ```
   STORAGE_DRIVER=s3
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   AWS_S3_BUCKET=your-bucket-name
   ```
4. Restart the backend. No code changes needed.

## Deploying to AWS EC2

1. Launch an EC2 instance (Ubuntu, t2.micro/t3.small is enough for a demo),
   open inbound ports 80 and 443 in the security group.
2. Install Docker and Docker Compose on the instance.
3. Copy this repo to the instance (`git clone` or `scp`).
4. Set real values in `backend/.env` (`JWT_SECRET`, and S3 credentials if
   using S3), then run `docker compose up -d --build`.
5. Point a domain at the instance's IP, and optionally put Nginx behind
   HTTPS with Let's Encrypt (certbot) or an AWS load balancer/ACM
   certificate in front.

`.github/workflows/ci.yml` runs on every push: installs both apps, builds
the frontend, and verifies both Docker images build cleanly — a
lightweight CI/CD pipeline that can be extended to auto-deploy to EC2 via
SSH or to push images to a registry.

## API overview

| Method | Endpoint                              | Description                  |
|--------|-----------------------------------------|-------------------------------|
| POST   | `/api/auth/register`                   | Create an account             |
| POST   | `/api/auth/login`                      | Log in, get a JWT             |
| GET    | `/api/files?search=`                   | List owned + shared files     |
| POST   | `/api/files`                           | Upload a new file             |
| GET    | `/api/files/:id/download`              | Download current version      |
| DELETE | `/api/files/:id`                       | Delete a file                 |
| POST   | `/api/files/:id/versions`              | Upload a new version          |
| GET    | `/api/files/:id/versions`              | List version history          |
| GET    | `/api/files/:id/versions/:vid/download`| Download a specific version   |
| POST   | `/api/files/:id/share`                 | Share with another user       |
| GET    | `/api/files/:id/shares`                | List who a file is shared with|
| DELETE | `/api/files/:id/share/:shareId`        | Revoke access                 |
| GET    | `/api/analytics`                       | Storage usage stats           |

All routes except `/api/auth/*` require `Authorization: Bearer <token>`.

## Project structure

```
clouddrive/
├── backend/          Express API, PostgreSQL access, storage layer
├── frontend/          React app (Vite)
├── docker-compose.yml  Runs postgres + backend + frontend together
└── .github/workflows/  CI pipeline
```
