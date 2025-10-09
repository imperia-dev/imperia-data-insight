import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export const btgAuthRequestSchema = z.object({
  trigger: z.enum(['manual', 'scheduled', 'manual_test']).optional(),
  timestamp: z.string().datetime().optional(),
});

export type BTGAuthRequest = z.infer<typeof btgAuthRequestSchema>;
