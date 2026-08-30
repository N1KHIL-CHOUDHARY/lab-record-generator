import mongoose from 'mongoose';
import { prisma } from '../src/config/prisma.js';
import dotenv from 'dotenv';
import { decodeBase62 } from '../src/utils/base62.js';

dotenv.config();

async function migrate() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('ERROR: MONGODB_URI environment variable is required to run migration.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  console.log('Connecting to PostgreSQL (Prisma)...');
  await prisma.$connect();
  console.log('Connected to PostgreSQL.');

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }

  // 1. Migrate Users
  console.log('\n--- Migrating Users ---');
  const mongoUsers = await db.collection('users').find({}).toArray();
  console.log(`Found ${mongoUsers.length} users in MongoDB.`);

  const userIdMap = new Map<string, string>(); // mongo _id string -> postgres id

  for (const u of mongoUsers) {
    const mongoId = u._id.toString();
    const existing = await prisma.user.findUnique({
      where: { firebaseUid: u.firebaseUid },
    });

    if (existing) {
      userIdMap.set(mongoId, existing.id);
      console.log(`User already exists in Postgres: ${u.email || u.name} (${existing.id})`);
    } else {
      const created = await prisma.user.create({
        data: {
          firebaseUid: u.firebaseUid,
          name: u.name || 'User',
          email: u.email || null,
          avatar: u.avatar || null,
          createdAt: u.createdAt || new Date(),
          updatedAt: u.updatedAt || new Date(),
        },
      });
      userIdMap.set(mongoId, created.id);
      console.log(`Migrated User: ${created.name} (${created.id})`);
    }
  }

  // 2. Migrate Subjects
  console.log('\n--- Migrating Subjects ---');
  const mongoSubjects = await db.collection('subjects').find({}).toArray();
  console.log(`Found ${mongoSubjects.length} subjects in MongoDB.`);

  const subjectIdMap = new Map<string, string>(); // mongo _id -> postgres id

  for (const s of mongoSubjects) {
    const mongoId = s._id.toString();
    const pgUserId = userIdMap.get(s.userId?.toString());

    if (!pgUserId) {
      console.warn(`Skipping subject ${s.subjectName} (${mongoId}): User not found.`);
      continue;
    }

    const created = await prisma.subject.create({
      data: {
        userId: pgUserId,
        subjectName: s.subjectName,
        subjectCode: s.subjectCode,
        subjectCodeAlt: s.subjectCodeAlt || null,
        studentName: s.studentName || '',
        registerNumber: s.registerNumber || '',
        semester: s.semester || null,
        facultyName: s.facultyName || null,
        createdAt: s.createdAt || new Date(),
        updatedAt: s.updatedAt || new Date(),
      },
    });
    subjectIdMap.set(mongoId, created.id);
    console.log(`Migrated Subject: ${created.subjectCode} - ${created.subjectName} (${created.id})`);
  }

  // 3. Migrate QRs
  console.log('\n--- Migrating QRs ---');
  const mongoQrs = await db.collection('qrs').find({}).toArray();
  console.log(`Found ${mongoQrs.length} QRs in MongoDB.`);

  const qrShortCodeMap = new Map<string, string>(); // shortCode -> postgres QR.id
  let maxCounter = 100000n;

  for (const q of mongoQrs) {
    const shortCode = (q.shortId || q.shortCode || '').trim();
    if (!shortCode) continue;

    const pgUserId = userIdMap.get((q.createdBy || q.userId)?.toString());
    if (!pgUserId) {
      console.warn(`Skipping QR ${shortCode}: Owner user not found.`);
      continue;
    }

    try {
      const decodedVal = decodeBase62(shortCode);
      if (decodedVal > maxCounter) {
        maxCounter = decodedVal;
      }
    } catch {
      // Short code may have used non-standard alphanumeric characters
    }

    const destinationUrl = q.targetUrl || q.originalUrl || q.destinationUrl || '';

    const existing = await prisma.qR.findUnique({
      where: { shortCode },
    });

    if (existing) {
      qrShortCodeMap.set(shortCode, existing.id);
    } else {
      const created = await prisma.qR.create({
        data: {
          shortCode,
          destinationUrl,
          userId: pgUserId,
          status: 'ACTIVE' as any,
          totalScans: q.totalScans || 0,
          lastScannedAt: q.lastScannedAt || null,
          createdAt: q.createdAt || new Date(),
          updatedAt: q.updatedAt || new Date(),
        },
      });
      qrShortCodeMap.set(shortCode, created.id);
      console.log(`Migrated QR: /r/${shortCode} -> ${destinationUrl}`);
    }
  }

  // 4. Migrate Experiments
  console.log('\n--- Migrating Experiments ---');
  const mongoExperiments = await db.collection('experiments').find({}).toArray();
  console.log(`Found ${mongoExperiments.length} experiments in MongoDB.`);

  for (const exp of mongoExperiments) {
    const pgSubjectId = subjectIdMap.get(exp.subjectId?.toString());
    const pgUserId = userIdMap.get(exp.userId?.toString());

    if (!pgSubjectId || !pgUserId) {
      console.warn(`Skipping experiment ${exp.experimentName}: Subject or User not found.`);
      continue;
    }

    const qrShortId = exp.qrShortId || '';
    const pgQrId = qrShortCodeMap.get(qrShortId) || null;

    await prisma.experiment.create({
      data: {
        subjectId: pgSubjectId,
        userId: pgUserId,
        experimentNo: exp.experimentNo,
        experimentName: exp.experimentName,
        experimentDate: exp.experimentDate ? new Date(exp.experimentDate) : new Date(),
        githubLink: exp.githubLink,
        qrId: pgQrId,
        qrImage: exp.qrImage || null,
        order: exp.order || 0,
        createdAt: exp.createdAt || new Date(),
        updatedAt: exp.updatedAt || new Date(),
      },
    });
    console.log(`Migrated Experiment #${exp.experimentNo}: ${exp.experimentName}`);
  }

  // 5. Migrate Records
  console.log('\n--- Migrating Records ---');
  const mongoRecords = await db.collection('records').find({}).toArray();
  console.log(`Found ${mongoRecords.length} records in MongoDB.`);

  for (const r of mongoRecords) {
    const pgUserId = userIdMap.get(r.userId?.toString());
    const pgSubjectId = subjectIdMap.get(r.subjectId?.toString());

    if (!pgUserId || !pgSubjectId) {
      console.warn(`Skipping record for subject ${r.subjectName}: Subject or User not found.`);
      continue;
    }

    await prisma.record.create({
      data: {
        userId: pgUserId,
        subjectId: pgSubjectId,
        subjectName: r.subjectName,
        subjectCode: r.subjectCode,
        subjectCodeAlt: r.subjectCodeAlt || null,
        studentName: r.studentName || '',
        registerNumber: r.registerNumber || '',
        experiments: r.experiments || [],
        pdfUrl: r.pdfUrl || null,
        docxUrl: r.docxUrl || null,
        status: 'ACTIVE' as any,
        createdAt: r.createdAt || new Date(),
        updatedAt: r.updatedAt || new Date(),
      },
    });
    console.log(`Migrated Record: ${r.subjectCode} (${r.experiments?.length || 0} exps)`);
  }

  // 6. Initialize ShortCodeCounter and PostgreSQL Sequence
  console.log('\n--- Initializing ShortCodeCounter & short_code_seq ---');
  const nextCounterVal = maxCounter + 1n;
  await prisma.shortCodeCounter.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton',
      currentValue: nextCounterVal,
    },
    update: {
      currentValue: nextCounterVal,
    },
  });
  console.log(`Initialized ShortCodeCounter to ${nextCounterVal.toString()}`);

  // Initialize or synchronize native PostgreSQL sequence
  await prisma.$executeRaw`
    CREATE SEQUENCE IF NOT EXISTS short_code_seq
      START WITH 100000
      INCREMENT BY 1
      CACHE 50;
  `;
  await prisma.$executeRaw`
    SELECT setval('short_code_seq', ${nextCounterVal}, false);
  `;
  console.log(`Synchronized short_code_seq to start next at ${nextCounterVal.toString()}`);

  console.log('\n=== MIGRATION COMPLETE ===\n');
}

migrate()
  .catch((err) => {
    console.error('Migration failed with error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
    await prisma.$disconnect();
  });
