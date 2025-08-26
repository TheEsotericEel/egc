import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Core
  DATABASE_URL: z.string().url(),
  ENCRYPTION_KEY_V1: z.string().min(32, "ENCRYPTION_KEY_V1 must be at least 32 chars"),
  CRON_SECRET: z.string().min(10),

  // Billing (choose one provider later; keep optional for now)
  BILLING_PROVIDER: z.enum(["stripe", "lemonsqueezy"]).optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  LEMONSQUEEZY_API_KEY: z.string().optional(),

  // eBay OAuth (will be required in OAuth phase; optional for now)
  EBAY_APP_ID: z.string().optional(),
  EBAY_CERT_ID: z.string().optional(),
  EBAY_DEV_ID: z.string().optional(),
  EBAY_RUNAME: z.string().optional()
});

export const env = schema.parse({
  NODE_ENV: process.env.NODE_ENV,

  DATABASE_URL: process.env.DATABASE_URL,
  ENCRYPTION_KEY_V1: process.env.ENCRYPTION_KEY_V1,
  CRON_SECRET: process.env.CRON_SECRET,

  BILLING_PROVIDER: process.env.BILLING_PROVIDER as any,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  LEMONSQUEEZY_API_KEY: process.env.LEMONSQUEEZY_API_KEY,

  EBAY_APP_ID: process.env.EBAY_APP_ID,
  EBAY_CERT_ID: process.env.EBAY_CERT_ID,
  EBAY_DEV_ID: process.env.EBAY_DEV_ID,
  EBAY_RUNAME: process.env.EBAY_RUNAME
});
