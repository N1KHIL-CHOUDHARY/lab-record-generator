export interface SavedRecord {
  id: string;
  recordName: string;
  courseTitle: string;
  studentName: string;
  registerNumber: string;
  experiments: Array<{
    id: string;
    title: string;
    date: string;
    githubLink: string;
  }>;
  updatedAt: string;
}