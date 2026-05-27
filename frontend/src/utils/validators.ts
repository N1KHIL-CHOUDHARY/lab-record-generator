import { z } from 'zod';

const githubRegex =
  /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}\/[a-zA-Z0-9._-]+\/?$/;

export const workspaceSchema = z.object({
  subjectLine: z
    .string()
    .min(1, 'Subject is required')
    .refine((v) => v.includes('-'), {
      message: 'Use format: Subject Code - Subject Name',
    }),
  studentName: z.string().min(1, 'Student name is required'),
  registerNumber: z.string().min(1, 'Register number is required'),
});

export const experimentRowSchema = z.object({
  experimentNo: z.number().int().min(1),
  experimentName: z.string().min(1, 'Name required'),
  experimentDate: z.string().min(1, 'Date required'),
  githubLink: z
    .string()
    .min(1, 'GitHub URL required')
    .refine((url) => githubRegex.test(url.trim()), {
      message: 'Invalid GitHub repository URL',
    }),
});

export type WorkspaceFormData = z.infer<typeof workspaceSchema>;
export type ExperimentRowData = z.infer<typeof experimentRowSchema>;

export const subjectSchema = z.object({
  subjectCode: z.string().min(1),
  subjectCodeAlt: z.string().optional(),
  subjectName: z.string().min(1),
  studentName: z.string().min(1),
  registerNumber: z.string().min(1),
});

export type SubjectFormData = z.infer<typeof subjectSchema>;
