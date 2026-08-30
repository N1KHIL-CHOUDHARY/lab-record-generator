import { z } from 'zod';

export const workspaceSchema = z.object({
  subjectLine: z.string().min(1, 'Subject is required'),
  studentName: z.string().min(1, 'Student name is required'),
  registerNumber: z.string().min(1, 'Register number is required'),
});

export type WorkspaceFormData = z.infer<typeof workspaceSchema>;

export const experimentRowSchema = z.object({
  experimentNo: z.number().optional(),
  experimentName: z.string().min(1, 'Experiment name is required'),
  experimentDate: z.string().optional().or(z.literal('')),
  githubLink: z.string().url('Must be a valid URL').regex(/github\.com/, 'Must be a GitHub repository'),
});

export type ExperimentRowFormData = z.infer<typeof experimentRowSchema>;
export type ExperimentRowData = ExperimentRowFormData & { experimentNo?: number };

export interface SubjectFormData {
  subjectName: string;
  subjectCode: string;
  subjectCodeAlt?: string;
  studentName: string;
  registerNumber: string;
  semester?: string;
  facultyName?: string;
}