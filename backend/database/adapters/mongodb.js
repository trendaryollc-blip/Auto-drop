/**
 * MongoDB Database Adapter (Future-Ready)
 *
 * Stub implementation. To use:
 *   1. Install: npm install mongodb
 *   2. Set DB_ADAPTER=mongodb in .env
 *   3. Uncomment import in database/index.js
 *
 * Interface matches FirestoreAdapter for seamless swapping.
 */

export default class MongoAdapter {
  constructor() {
    this._client = null;
    this._db = null;
  }

  async connect(config) {
    // const { MongoClient } = await import('mongodb');
    // this._client = new MongoClient(config.mongo?.uri || 'mongodb://localhost:27017');
    // await this._client.connect();
    // this._db = this._client.db(config.mongo?.dbName || 'huntdrop');
    throw new Error('MongoDB adapter not implemented. Install "mongodb" and configure.');
  }

  async disconnect() {
    if (this._client) {
      await this._client.close();
      this._client = null;
      this._db = null;
    }
  }

  collection(name) {
    return new MongoCollectionRef(this._db.collection(name));
  }
}

class MongoCollectionRef {
  constructor(col) {
    this._col = col;
    this._filters = [];
    this._order = null;
    this._limitN = null;
  }

  where(field, op, value) {
    const clone = this._clone();
    const opMap = { '==': '$eq', '!=': '$ne', '<': '$lt', '<=': '$lte', '>': '$gt', '>=': '$gte', 'in': '$in', 'array-contains': '$elemMatch' };
    clone._filters.push({ [field]: { [opMap[op] || op]: value } });
    return clone;
  }

  orderBy(field, direction = 'asc') {
    const clone = this._clone();
    clone._order = { [field]: direction === 'desc' ? -1 : 1 };
    return clone;
  }

  limit(n) {
    const clone = this._clone();
    clone._limitN = n;
    return clone;
  }

  doc(id) {
    return new MongoDocRef(this._col, id);
  }

  async add(data) {
    const doc = { ...data, createdAt: new Date(), updatedAt: new Date() };
    const result = await this._col.insertOne(doc);
    return { id: result.insertedId.toString() };
  }

  async get() {
    const filter = Object.assign({}, ...this._filters);
    const sort = this._order || {};
    const cursor = this._col.find(filter).sort(sort);
    if (this._limitN) cursor.limit(this._limitN);
    const docs = await cursor.toArray();
    return docs.map(d => ({ id: d._id.toString(), data: () => ({ id: d._id.toString(), ...d }) }));
  }

  async count() {
    const filter = Object.assign({}, ...this._filters);
    return this._col.countDocuments(filter);
  }

  _clone() {
    const c = new MongoCollectionRef(this._col);
    c._filters = [...this._filters];
    c._order = this._order ? { ...this._order } : null;
    c._limitN = this._limitN;
    return c;
  }
}

class MongoDocRef {
  constructor(col, id) {
    this._col = col;
    this._id = id;
  }

  async get() {
    const { ObjectId } = await import('mongodb');
    const doc = await this._col.findOne({ _id: new ObjectId(this._id) });
    if (!doc) return null;
    return { id: doc._id.toString(), ...doc };
  }

  async set(data) {
    const { ObjectId } = await import('mongodb');
    const doc = { ...data, _id: new ObjectId(this._id), updatedAt: new Date(), createdAt: data.createdAt || new Date() };
    await this._col.replaceOne({ _id: new ObjectId(this._id) }, doc, { upsert: true });
    return { id: this._id };
  }

  async update(data) {
    const { ObjectId } = await import('mongodb');
    await this._col.updateOne({ _id: new ObjectId(this._id) }, { $set: { ...data, updatedAt: new Date() } });
    return { id: this._id };
  }

  async delete() {
    const { ObjectId } = await import('mongodb');
    await this._col.deleteOne({ _id: new ObjectId(this._id) });
    return { id: this._id };
  }
}
