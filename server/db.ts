import { neon } from '@neondatabase/serverless';

const DATABASE_KEYS = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRES_PRISMA_URL',
  'NEON_DATABASE_URL',
  'DATABASE_URL_UNPOOLED',
  'POSTGRES_URL_NON_POOLING',
];

const DATABASE_NAME = /DATABASE_URL|POSTGRES_URL|POSTGRES_PRISMA_URL|POSTGRES_URL_NON_POOLING|DATABASE_URL_UNPOOLED/;

export function databaseUrl() {
  const seen = new Set<string>();
  const ranked = [
    ...DATABASE_KEYS,
    ...Object.keys(process.env).filter((key) => DATABASE_NAME.test(key)),
  ];
  for (const key of ranked) {
    if (seen.has(key)) continue;
    seen.add(key);
    const value = process.env[key]?.trim();
    if (value && /^postgres(ql)?:\/\//i.test(value)) return value;
  }
  return '';
}

export function getSql() {
  const url = databaseUrl();
  if (!url) throw new Error('DATABASE_URL is not set');
  return neon(url);
}
