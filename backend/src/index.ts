import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import { env, validateProductionEnv } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { initFirebase } from './config/firebase.js';
import apiRoutes from './routes/index.js';
import redirectRoutes from './routes/redirectRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

validateProductionEnv();

const app = express();

app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const allowedOrigins = Array.from(
  new Set([
    'https://recordgenerator.vercel.app',
    'http://localhost:5173',
    'http://localhost:5000',
    ...(env.clientUrl ? [env.clientUrl] : []),
  ])
);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      allowedOrigins.includes(origin.replace(/\/$/, '')) ||
      /^https:\/\/recordgenerator.*\.vercel\.app$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(
  rateLimit({
    windowMs: env.rateLimit.windowMs,
    max: env.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());

// Dynamic QR code endpoint with on-the-fly regeneration for ephemeral hosts (Render/Vercel/Heroku)
app.get('/uploads/qr/:filename', async (req, res) => {
  const rawFilename = req.params.filename || '';
  const shortId = rawFilename.replace(/\.png$/i, '').trim();

  if (!shortId) {
    return res.status(404).json({ success: false, error: 'Invalid QR identifier' });
  }

  const qrDir = path.join(process.cwd(), 'uploads', 'qr');
  const filePath = path.join(qrDir, `${shortId}.png`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('Content-Type', 'image/png');

  try {
    const fileExists = await fs.promises.access(filePath).then(() => true).catch(() => false);
    if (fileExists) {
      return res.sendFile(filePath);
    }

    const redirectUrl = `${env.appUrl}/r/${shortId}`;
    const qrBuffer = await QRCode.toBuffer(redirectUrl, {
      type: 'png',
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#000000', light: '#FFFFFF' },
    });

    fs.promises.mkdir(qrDir, { recursive: true })
      .then(() => fs.promises.writeFile(filePath, qrBuffer))
      .catch((err) => console.error('Failed to cache QR code to disk:', err));

    return res.end(qrBuffer);
  } catch (err) {
    console.error('Failed to serve/generate QR code image:', err);
    return res.status(500).json({ success: false, error: 'Failed to generate QR code image' });
  }
});

app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(path.join(process.cwd(), 'uploads'))
);

app.use(
  '/assets',
  (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(path.join(process.cwd(), 'assets'))
);

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Smart Lab Record API is running' });
});

app.use('/r', redirectRoutes);
app.use('/api', apiRoutes);

app.use(errorHandler);

async function start() {
  try {
    initFirebase();
    await connectDatabase();

    app.listen(env.port, () => {
      console.log(`Server running on port ${env.port} [${env.nodeEnv}]`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
