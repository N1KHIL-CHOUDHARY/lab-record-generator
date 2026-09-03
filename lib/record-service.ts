import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';

export interface LabRecordDocument {
  id?: string;
  userId: string;
  userEmail: string | null;
  studentName: string;
  registerNumber: string;
  courseCode: string;
  courseTitle: string;
  recordDate: string;
  createdAt: string;
  updatedAt: string;
  experiments: Array<{
    experimentNo: number;
    title: string;
    date: string;
    githubUrl: string; // Plain text repository/solution link
  }>;
}

export type LabRecordInput = Omit<
  LabRecordDocument,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
>;

/**
 * Splits combined course inputs like "19AI410 - Machine Learning"
 * into distinct courseCode and courseTitle fields.
 */
export function parseCourseInfo(rawTitle: string): { courseCode: string; courseTitle: string } {
  const trimmed = rawTitle.trim();
  if (trimmed.includes(' - ')) {
    const [code, ...rest] = trimmed.split(' - ');
    return {
      courseCode: code.trim(),
      courseTitle: rest.join(' - ').trim(),
    };
  }
  if (trimmed.includes('/')) {
    const [code, ...rest] = trimmed.split('/');
    return {
      courseCode: code.trim(),
      courseTitle: rest.join('/').trim(),
    };
  }
  return {
    courseCode: '',
    courseTitle: trimmed,
  };
}

/**
 * Saves a lab record text metadata to Firestore under users/{userId}/records/{recordId}
 * Excludes any binary, canvas, base64 or QR image assets.
 */
export async function saveLabRecord(
  userId: string,
  data: LabRecordInput,
  recordId?: string
): Promise<string> {
  if (!db) {
    throw new Error('Firestore is not configured. Please verify your Firebase configuration.');
  }

  const now = new Date().toISOString();

  // If a valid recordId exists, update or upsert with merge
  if (recordId && recordId.trim() && !recordId.startsWith('rec-local-')) {
    const docRef = doc(db, 'users', userId, 'records', recordId.trim());
    await setDoc(
      docRef,
      {
        ...data,
        userId,
        updatedAt: now,
      },
      { merge: true }
    );
    return recordId.trim();
  }

  // Otherwise, create a new document in the subcollection
  const recordsCol = collection(db, 'users', userId, 'records');
  const docRef = await addDoc(recordsCol, {
    ...data,
    userId,
    createdAt: now,
    updatedAt: now,
  });

  return docRef.id;
}

/**
 * Fetches all saved lab records for a specific user ordered by updatedAt descending.
 */
export async function getUserLabRecords(userId: string): Promise<LabRecordDocument[]> {
  if (!db) {
    return [];
  }

  const recordsCol = collection(db, 'users', userId, 'records');

  try {
    const q = query(recordsCol, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<LabRecordDocument, 'id'>),
    }));
  } catch (error) {
    // Fallback: If compound index is missing, fetch unordered and sort in memory
    console.warn('Query with orderBy failed, falling back to memory sort:', error);
    const snapshot = await getDocs(recordsCol);
    const records = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<LabRecordDocument, 'id'>),
    }));

    return records.sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }
}

/**
 * Deletes a lab record document from Firestore.
 */
export async function deleteLabRecord(userId: string, recordId: string): Promise<void> {
  if (!db || !userId || !recordId) return;
  const docRef = doc(db, 'users', userId, 'records', recordId);
  await deleteDoc(docRef);
}
