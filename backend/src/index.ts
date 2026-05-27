import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import path from 'path';
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

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);

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

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/assets', express.static(path.join(process.cwd(), 'assets')));

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
