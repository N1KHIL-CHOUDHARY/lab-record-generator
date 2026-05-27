import { z } from 'zod';

const githubRegex =
  /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}\/[a-zA-Z0-9._-]+\/?$/;

export const subjectSchema = z.object({
  subjectCode: z.string().min(1, 'Subject code is required'),
  subjectCodeAlt: z.string().optional(),
  subjectName: z.string().min(1, 'Subject title is required'),
  studentName: z.string().min(1, 'Student name is required'),
  registerNumber: z.string().min(1, 'Register number is required'),
});

export const experimentSchema = z.object({
  experimentNo: z.coerce.number().int().min(1, 'Experiment number must be at least 1'),
  experimentName: z.string().min(1, 'Experiment name is required'),
  experimentDate: z.string().min(1, 'Date is required'),
  githubLink: z
    .string()
    .min(1, 'GitHub link is required')
    .refine((url) => githubRegex.test(url.trim()), {
      message: 'Must be a valid GitHub repository URL (e.g. https://github.com/user/repo)',
    }),
});

export type SubjectFormData = z.infer<typeof subjectSchema>;
export type ExperimentFormData = z.infer<typeof experimentSchema>;
