/**
 * Firestore Database Adapter
 *
 * Implements the CollectionRef interface for Google Cloud Firestore.
 * Supports where(), orderBy(), limit(), get(), set(), update(), delete(), add().
 */

import admin from 'firebase-admin';

export default class FirestoreAdapter {
  constructor() {
    this._app = null;
    this._db = null;
  }

  async connect(config) {
    const { projectId, privateKey, clientEmail, serviceAccountPath } = config.firebase;

    // Avoid double-initializing
    if (this._app) return;

    // Build credential from env vars or service account file
    let credential;
    if (serviceAccountPath) {
      const { readFileSync } = await import('node:fs');
      const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));
      credential = admin.credential.cert(serviceAccount);
    } else if (projectId && privateKey && clientEmail) {
      credential = admin.credential.cert({ projectId, privateKey, clientEmail });
    } else {
      // For local development with firebase emulators or ADC
      console.warn('[Firestore] No credentials provided — using default credentials');
      credential = admin.credential.applicationDefault();
    }

    this._app = admin.initializeApp({ credential });
    this._db = admin.firestore();

    // Enable offline persistence in development
    if (config.isDev) {
      this._db.settings({ ignoreUndefinedProperties: true });
    }
  }

  async disconnect() {
    if (this._app) {
      await this._app.delete();
      this._app = null;
      this._db = null;
    }
  }

  collection(name) {
    return new FirestoreCollectionRef(this._db.collection(name));
  }
}

/**
 * Wraps a Firestore CollectionReference with the standard adapter interface.
 */
class FirestoreCollectionRef {
  constructor(ref) {
    this._ref = ref;
    this._filters = [];
    this._order = null;
    this._limitN = null;
  }

  where(field, op, value) {
    const clone = this._clone();
    clone._filters.push({ field, op, value });
    return clone;
  }

  orderBy(field, direction = 'asc') {
    const clone = this._clone();
    clone._order = { field, direction };
    return clone;
  }

  limit(n) {
    const clone = this._clone();
    clone._limitN = n;
    return clone;
  }

  doc(id) {
    return new FirestoreDocRef(this._ref.doc(id));
  }

  async add(data) {
    const now = admin.firestore.FieldValue.serverTimestamp();
    const docRef = await this._ref.add({
      ...data,
      createdAt: now,
      updatedAt: now,
    });
    return { id: docRef.id };
  }

  async get() {
    let query = this._ref;
    for (const f of this._filters) {
      query = query.where(f.field, f.op, f.value);
    }
    if (this._order) {
      query = query.orderBy(this._order.field, this._order.direction);
    }
    if (this._limitN !== null) {
      query = query.limit(this._limitN);
    }
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      data: () => ({ id: doc.id, ...doc.data() }),
    }));
  }

  async count() {
    let query = this._ref;
    for (const f of this._filters) {
      query = query.where(f.field, f.op, f.value);
    }
    const snapshot = await query.count().get();
    return snapshot.data().count;
  }

  _clone() {
    const c = new FirestoreCollectionRef(this._ref);
    c._filters = [...this._filters];
    c._order = this._order ? { ...this._order } : null;
    c._limitN = this._limitN;
    return c;
  }
}

/**
 * Wraps a Firestore DocumentReference with get/set/update/delete.
 */
class FirestoreDocRef {
  constructor(ref) {
    this._ref = ref;
  }

  async get() {
    const doc = await this._ref.get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  async set(data) {
    const now = admin.firestore.FieldValue.serverTimestamp();
    await this._ref.set({
      ...data,
      updatedAt: now,
      createdAt: data.createdAt || now,
    });
    return { id: this._ref.id };
  }

  async update(data) {
    const now = admin.firestore.FieldValue.serverTimestamp();
    await this._ref.update({
      ...data,
      updatedAt: now,
    });
    return { id: this._ref.id };
  }

  async delete() {
    await this._ref.delete();
    return { id: this._ref.id };
  }
}
