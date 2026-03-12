import { pgTable, text, integer, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// TTS generation request (stored in memory only — no DB needed)
export const generationSchema = z.object({
  text: z.string().min(1).max(5000),
  voiceId: z.string().min(1),
  stability: z.number().min(0).max(1).default(0.5),
  similarityBoost: z.number().min(0).max(1).default(0.75),
  style: z.number().min(0).max(1).default(0),
  useSpeakerBoost: z.boolean().default(true),
});

export type GenerationRequest = z.infer<typeof generationSchema>;
