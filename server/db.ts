import { neon } from '@neondatabase/serverless';

const DATABASE_KEYS = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRES_PRISMA_URL',
  'NEON_DATABASE_URL',
  'DATABASE_URL_UNPOOLED',
  'POSTGRES_URL_NON_POOLING',
];

export function databaseUrl() {
  for (const key of DATABASE_KEYS) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return '';
}

export function getSql() {
  const url = databaseUrl();
  if (!url) throw new Error('DATABASE_URL is not set');
  return neon(url);
}
