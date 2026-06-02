import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@/db/schema';

type ReviewGuardDb = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as typeof globalThis & {
  reviewGuardPool?: Pool;
  reviewGuardDb?: ReviewGuardDb;
};

function getConnectionString() {
  return process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/review_guard';
}

export function getDb() {
  if (!globalForDb.reviewGuardDb) {
    if (!process.env.DATABASE_URL) {
      console.warn(
        'DATABASE_URL is not set. ReviewGuard will use Demo/Mock mode until Postgres is configured.'
      );
    }

    const pool =
      globalForDb.reviewGuardPool ??
      new Pool({
        connectionString: getConnectionString(),
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

    if (process.env.NODE_ENV !== 'production') {
      globalForDb.reviewGuardPool = pool;
    }

    globalForDb.reviewGuardDb = drizzle(pool, { schema });
  }

  return globalForDb.reviewGuardDb;
}

export const db = new Proxy({} as ReviewGuardDb, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
