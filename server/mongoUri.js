import dotenv from 'dotenv';

dotenv.config();

/**
 * Prefer MONGODB_URI (e.g. Atlas); fall back to MONGO_URI, then local default.
 * Database name comes from the URI path only (e.g. .../wealthos?... → database `wealthos`).
 * Models write to collections: users, customers, alerts (see server/models/*).
 */
export function getMongoUri() {
  return (
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    'mongodb://localhost:27017/wealthos'
  );
}

/** True when .env sets an explicit connection string (Atlas or custom host). */
export function hasExplicitMongoUri() {
  return Boolean(process.env.MONGODB_URI || process.env.MONGO_URI);
}
