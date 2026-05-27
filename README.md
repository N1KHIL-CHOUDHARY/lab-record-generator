# Smart Lab Record Generator

A production-quality SaaS-style web app for college students to generate professional lab record tables with **permanent QR codes**, GitHub integration, and DOCX/PDF export.

## College document format

Exports match official lab record layout:

- A4, Times New Roman, exact column widths (Exp, Date, Name, QR, Mark, Signature)
- 0.72″ QR codes, banner header, “Table of content” subtitle
- Student declaration footer with name, register number, signature line

**Banner image:** Replace `backend/assets/college-banner.png` and `frontend/public/college-banner.png` with your college banner (7.4″ × 1.65″ recommended). SVG placeholders are included until you add PNG.

## Features

- Google Authentication (Firebase + JWT)
- Unified record workspace with live A4 preview
- Subject & experiment management
- **Permanent QR codes** via short redirect links (`/r/:shortId` → GitHub URL)
- Editable QR destinations without reprinting
- QR scan analytics
- DOCX & PDF export (tables, QR images, declaration & signature sections)
- Export history (latest 10 records per user, auto-trim)
- Dark/light mode
- Drag-and-drop experiment ordering
- Modern React dashboard with charts

## Tech Stack

| Layer    | Technologies |
|----------|-------------|
| Frontend | React, Vite, TypeScript, TailwindCSS, React Router, Axios, React Hook Form, Zod, Framer Motion, Recharts |
| Backend  | Node.js, Express, TypeScript, MongoDB, Mongoose, Firebase Admin, JWT |
| Auth     | Firebase Google Sign-In + server JWT |
| Export   | `docx`, Puppeteer (PDF) |
| QR       | `qrcode` npm package |

## Project Structure

```
lab-record/
├── frontend/          # React + Vite app
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── layouts/
│       ├── contexts/
│       ├── services/
│       ├── routes/
│       └── types/
├── backend/           # Express API
│   └── src/
│       ├── controllers/
│       ├── routes/
│       ├── models/
│       ├── services/
│       ├── middleware/
│       └── validators/
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB Atlas (or local MongoDB)
- Firebase project with Google sign-in enabled

### 1. Firebase Setup

1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Authentication → Google** sign-in
3. Add a Web app and copy client config → `frontend/.env`
4. Generate a **Service Account** key → use in `backend/.env` (`FIREBASE_*` vars)

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your values
npm install
npm run dev
```

Server runs at `http://localhost:5000`

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# Edit .env with Firebase + API URL
npm install
npm run dev
```

App runs at `http://localhost:5173`

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Service account email |
| `FIREBASE_PRIVATE_KEY` | Service account private key |
| `APP_URL` | Public API URL (for QR links & exports) |
| `CLIENT_URL` | Frontend URL (CORS) |

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend URL (`http://localhost:5000`) |
| `VITE_FIREBASE_*` | Firebase web app config |

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/google` | Exchange Firebase token for JWT |
| GET | `/api/auth/me` | Current user |
| POST | `/api/subjects` | Create subject |
| GET | `/api/subjects` | List subjects |
| GET | `/api/subjects/:id` | Subject + experiments |
| POST | `/api/experiments/:subjectId` | Add experiment + QR |
| PATCH | `/api/qr/:shortId` | Update QR destination URL |
| POST | `/api/records` | Generate DOCX & PDF |
| GET | `/api/history` | Last 10 records |
| GET | `/api/records/dashboard` | Dashboard stats |
| GET | `/r/:shortId` | QR redirect (increments scans) |

## QR Redirect System (USP)

QR codes encode **short links**, not raw GitHub URLs:

```
https://your-api.com/r/abx72k  →  https://github.com/user/repo
```

Benefits: permanent QR, editable links, scan tracking, smaller QR codes.

## Security

- JWT middleware on protected routes
- Helmet, CORS, rate limiting
- `express-mongo-sanitize`
- Secrets only in environment variables
- GitHub URL validation (frontend Zod + backend express-validator)

## Scripts

```bash
# Backend
npm run dev      # Development with hot reload
npm run build    # Compile TypeScript
npm start        # Production

# Frontend
npm run dev      # Vite dev server
npm run build    # Production build
npm run preview  # Preview production build
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Vercel (frontend), Render/Railway (backend), and MongoDB Atlas setup.

## License

MIT
# lab-record-generator
