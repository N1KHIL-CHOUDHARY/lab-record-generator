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

