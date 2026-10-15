import { z } from 'zod';

const optionalText = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  });

const envSchema = z.object({
  VATAR_SECRET: optionalText,
  VATAR_WEBHOOK_SECRET: optionalText,
  VATAR_API_BASE: z
    .string()
    .optional()
    .transform((value) => value?.trim() || 'https://lagoslife.app/api/games/v1')
    .pipe(z.string().url()),
  GAME_ORIGIN: z.string().min(1),
  PORT: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : '8080'))
    .pipe(z.coerce.number().int().positive()),
  ENTITLEMENTS_PATH: z
    .string()
    .optional()
    .transform((value) => value?.trim() || 'data/entitlements.json'),
});

export interface ServerEnv {
  secret?: string;
  webhookSecret?: string;
  apiBase: string;
  origins: string[];
  port: number;
  entitlementsPath: string;
}

export function loadEnv(source: NodeJS.ProcessEnv): ServerEnv {
  const parsed = envSchema.parse(source);
  return {
    secret: parsed.VATAR_SECRET,
    webhookSecret: parsed.VATAR_WEBHOOK_SECRET,
    apiBase: parsed.VATAR_API_BASE.replace(/\/$/, ''),
    origins: parsed.GAME_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    port: parsed.PORT,
    entitlementsPath: parsed.ENTITLEMENTS_PATH,
  };
}
