import { z } from 'zod';

export const workspaceSchema = z.object({
  subjectLine: z.string().trim().min(1, 'Subject code & name are required (e.g. 19MA220 - Mathematics for AI)'),
  studentName: z.string().trim().min(1, 'Student name is required'),
  registerNumber: z.string().trim().min(1, 'Register number is required'),
});

export type WorkspaceFormData = z.infer<typeof workspaceSchema>;

export const experimentRowSchema = z.object({
  experimentNo: z.number().min(1, 'Experiment # must be at least 1'),
  experimentDate: z.string().trim().min(1, 'Date is required'),
  experimentName: z.string().trim().min(1, 'Experiment title is required'),
  githubLink: z
    .string()
    .trim()
    .min(1, 'GitHub repository URL is required')
    .url('Must be a valid URL starting with https://')
    .refine((val) => val.includes('github.com'), 'Must be a GitHub repository URL (e.g. https://github.com/user/repo)'),
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