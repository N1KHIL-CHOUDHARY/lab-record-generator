# Deployment Guide

## Architecture

| Service  | Platform        | URL example              |
|----------|-----------------|--------------------------|
| Frontend | Vercel          | `https://labrecord.vercel.app` |
| Backend  | Render / Railway| `https://labrecord-api.onrender.com` |
| Database | MongoDB Atlas   | `mongodb+srv://...`      |

---

## 1. MongoDB Atlas

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a database user and whitelist IP `0.0.0.0/0` (or Vercel/Render IPs)
3. Copy connection string → `MONGODB_URI`

---

## 2. Backend (Render)

### Render

1. New **Web Service** → connect GitHub repo
2. Root directory: `backend`
3. Build command: `npm install --include=dev && npm run build` (or `npm install && npm run build`)
4. Start command: `npm start`
5. Add environment variables from `backend/.env.example`

**Important env vars for production:**

```
NODE_ENV=production
PORT=10000
APP_URL=https://your-api.onrender.com
CLIENT_URL=https://your-app.vercel.app
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<long-random-string>
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Railway

Same as Render — set root to `backend`, use `npm run build` and `npm start`.

### Puppeteer on Render/Railway

Add a buildpack or use Puppeteer's bundled Chromium. On Render, set:

```
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

Or install `chromium` in `Dockerfile` if using Docker.

### Persistent uploads

Render free tier has ephemeral disk. For production, migrate exports to **S3/Cloudinary** or use a persistent volume.

---

## 3. Frontend (Vercel)

1. Import repo on [vercel.com](https://vercel.com)
2. Root directory: `frontend`
3. Framework preset: **Vite**
4. Build: `npm run build`
5. Output: `dist`

### Environment variables

```
VITE_API_URL=https://your-api.onrender.com
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

`vercel.json` is included for SPA routing.

---

## 4. Firebase Production

1. Add authorized domains: `your-app.vercel.app`, `localhost`
2. Use the same Firebase project for frontend config and backend Admin SDK

---

## 5. CORS

Ensure `CLIENT_URL` on the backend matches your Vercel URL exactly (no trailing slash).

---

## 6. QR Links

Set `APP_URL` to your **backend** public URL so QR codes resolve correctly:

```
https://your-api.onrender.com/r/abc123
```

---

## 7. Health Check

Render health check path: `/health`

---

## 8. Post-Deploy Checklist

- [ ] Google sign-in works on production domain
- [ ] API `/health` returns 200
- [ ] Create subject → add experiment → QR image loads
- [ ] Scan QR → redirects to GitHub, scan count increments
- [ ] Generate PDF/DOCX downloads work
- [ ] History shows last exports

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS errors | Match `CLIENT_URL` to frontend URL |
| Firebase auth fails | Add domain to Firebase authorized domains |
| PDF export fails | Install Chromium / use Docker with Puppeteer deps |
| QR images 404 | Ensure `APP_URL` points to backend; `/uploads` is served |
| JWT 401 | Check `JWT_SECRET` is set on backend |
