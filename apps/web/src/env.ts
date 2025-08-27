import { z } from "zod";

const clientSchema = z.object({
  NEXT_PUBLIC_ENV: z.enum(["development", "preview", "production"]),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional()
});

export const env = clientSchema.parse({
  NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL
});





