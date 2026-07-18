/**
 * Database Abstraction Layer
 *
 * Provides a unified interface across different database backends.
 * Set DB_ADAPTER env var to switch: "firestore" | "mongodb" | "postgres"
 *
 * All adapters must implement:
 *   connect(config) → void
 *   disconnect() → void
 *   collection(name) → CollectionRef
 *
 * CollectionRef must implement:
 *   .doc(id) → { get(), set(data), update(data), delete() }
 *   .where(field, op, value) → CollectionRef
 *   .orderBy(field, direction) → CollectionRef
 *   .limit(n) → CollectionRef
 *   .add(data) → { id }
 *   .get() → [{ id, data() }]
 *   .count() → number
 */

import config from '../config/index.js';
import FirestoreAdapter from './adapters/firestore.js';

const adapters = {
  firestore: FirestoreAdapter,
  // mongodb: () => import('./adapters/mongodb.js'),   // lazy-load future adapters
  // postgres: () => import('./adapters/postgres.js'),
};

let activeAdapter = null;

/**
 * Initialize the database connection using the configured adapter.
 */
export async function connectDB() {
  const adapterName = config.db.adapter;
  const AdapterClass = adapters[adapterName];

  if (!AdapterClass) {
    throw new Error(`Unknown database adapter: "${adapterName}". Available: ${Object.keys(adapters).join(', ')}`);
  }

  activeAdapter = new AdapterClass();
  await activeAdapter.connect(config);
  console.log(`[DB] Connected via "${adapterName}" adapter`);
  return activeAdapter;
}

/**
 * Get the active database adapter instance.
 * @returns {Object} adapter instance
 */
export function getDB() {
  if (!activeAdapter) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }
  return activeAdapter;
}

/**
 * Get a collection reference from the active adapter.
 * @param {string} name - collection name
 * @returns {CollectionRef}
 */
export function collection(name) {
  return getDB().collection(name);
}

/**
 * Disconnect the active database connection.
 */
export async function disconnectDB() {
  if (activeAdapter) {
    await activeAdapter.disconnect();
    activeAdapter = null;
    console.log('[DB] Disconnected');
  }
}

export default { connectDB, getDB, collection, disconnectDB };
