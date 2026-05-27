export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Subject {
  _id: string;
  subjectName: string;
  subjectCode: string;
  subjectCodeAlt?: string;
  studentName: string;
  registerNumber: string;
  semester?: string;
  facultyName?: string;
  experimentCount?: number;
  createdAt: string;
}

export interface Experiment {
  _id: string;
  subjectId: string;
  experimentNo: number;
  experimentName: string;
  experimentDate: string;
  githubLink: string;
  qrShortId: string;
  qrImage: string;
  order: number;
}

export interface RecordItem {
  _id: string;
  subjectName: string;
  subjectCode: string;
  subjectCodeAlt?: string;
  studentName: string;
  registerNumber: string;
  experiments: Experiment[];
  pdfUrl?: string;
  docxUrl?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalRecords: number;
  totalSubjects: number;
  totalExperiments: number;
  qrScans: number;
  recentSubjects: Subject[];
  lastRecord: RecordItem | null;
  qrAnalytics: {
    shortId: string;
    originalUrl: string;
    totalScans: number;
    lastScannedAt?: string;
  }[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
