import { z } from "zod";

export const createLinkSchema = z.object({
  originalUrl: z.string().url(),
  customAlias: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Alias may only contain letters, numbers, "_" and "-"')
    .optional(),
  expiresAt: z.coerce.date().optional(),
});

export type CreateLinkDto = z.infer<typeof createLinkSchema>;
