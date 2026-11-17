import { z } from 'zod';

export const trackerSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .regex(/^[A-Z0-9-]+$/, 'Code must be uppercase letters, numbers, or hyphens only'),
  parentCode: z.string().optional().default(''),
  description: z.string().min(1, 'Description is required'),
  actionType: z.enum(['none', 'text', 'file', 'date'], {
    errorMap: () => ({ message: 'Select a valid action type' }),
  }),
  moduleFlow: z.string().optional().default(''),
  icon: z.string().optional().default(''),
  order: z.coerce.number().int().min(-1, 'Order must be >= -1'),
  mandays: z.coerce.number().int().min(-1, 'Mandays must be >= -1'),
  isUsingNotification: z.boolean().default(false),
  isPublic: z.boolean().default(false),
  isParallel: z.boolean().default(false),
});

export type TrackerFormData = z.infer<typeof trackerSchema>;

export const requestSchema = z
  .object({
    partnerId: z.string().optional().default(''),
    projectCode: z.string().min(1, 'Project Code is required'),
    totalFee: z.coerce.number().min(0, 'Total Fee must be >= 0'),
    lastStatus: z.string().optional().default(''),
    receivingStatus: z.string().optional().default(''),
    leadTime: z.coerce.number().int().optional(),
    receivedDate: z.string().optional().default(''),
    analysisWipDate: z.string().optional().default(''),
    analysisCompletedDate: z.string().optional().default(''),
  })
  .refine(
    (data) => {
      if (data.analysisWipDate && data.analysisCompletedDate) {
        return new Date(data.analysisCompletedDate) >= new Date(data.analysisWipDate);
      }
      return true;
    },
    {
      message: 'Completed Date must be on or after WIP Date',
      path: ['analysisCompletedDate'],
    }
  );

export type RequestFormData = z.infer<typeof requestSchema>;

export const trackingSchema = z.object({
  trackerCode: z.string().min(1, 'Tracker Code is required'),
  value: z.string().optional().default(''),
  trackerId: z.string().min(1, 'Tracker ID is required'),
  requestId: z.string().min(1, 'Request ID is required'),
  partnerId: z.string().optional().default(''),
});

export type TrackingFormData = z.infer<typeof trackingSchema>;

export const loginSchema = z.object({
  user: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
