/**
 * PostgreSQL Database Adapter (Future-Ready)
 *
 * Stub implementation. To use:
 *   1. Install: npm install pg
 *   2. Set DB_ADAPTER=postgres in .env
 *   3. Uncomment import in database/index.js
 *   4. Create tables matching the model schemas
 *
 * Interface matches FirestoreAdapter for seamless swapping.
 */

export default class PostgresAdapter {
  constructor() {
    this._pool = null;
  }

  async connect(config) {
    // const pg = await import('pg');
    // this._pool = new pg.Pool({
    //   connectionString: config.postgres?.url || 'postgresql://localhost:5432/huntdrop',
    //   max: 20,
    //   idleTimeoutMillis: 30000,
    // });
    // await this._pool.query('SELECT 1');
    throw new Error('PostgreSQL adapter not implemented. Install "pg" and configure.');
  }

  async disconnect() {
    if (this._pool) {
      await this._pool.end();
      this._pool = null;
    }
  }

  collection(name) {
    return new PostgresCollectionRef(this._pool, name);
  }
}

class PostgresCollectionRef {
  constructor(pool, table) {
    this._pool = pool;
    this._table = table;
    this._wheres = [];
    this._orderByClause = '';
    this._limitN = null;
  }

  where(field, op, value) {
    const clone = this._clone();
    const opMap = { '==': '=', '!=': '!=', '<': '<', '<=': '<=', '>': '>', '>=': '>=' };
    clone._wheres.push({ field, op: opMap[op] || op, value });
    return clone;
  }

  orderBy(field, direction = 'asc') {
    const clone = this._clone();
    clone._orderByClause = `ORDER BY "${field}" ${direction.toUpperCase()}`;
    return clone;
  }

  limit(n) {
    const clone = this._clone();
    clone._limitN = n;
    return clone;
  }

  doc(id) {
    return new PostgresDocRef(this._pool, this._table, id);
  }

  async add(data) {
    const { v4: uuid } = await import('uuid');
    const id = uuid();
    const keys = ['id', ...Object.keys(data)];
    const values = [id, ...Object.values(data)];
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO "${this._table}" (${keys.map(k => `"${k}"`).join(', ')}) VALUES (${placeholders}) RETURNING id`;
    await this._pool.query(sql, values);
    return { id };
  }

  async get() {
    let sql = `SELECT * FROM "${this._table}"`;
    const params = [];
    if (this._wheres.length > 0) {
      const conditions = this._wheres.map((w, i) => {
        params.push(w.value);
        return `"${w.field}" ${w.op} $${params.length}`;
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    if (this._orderByClause) sql += ` ${this._orderByClause}`;
    if (this._limitN !== null) sql += ` LIMIT ${this._limitN}`;
    const result = await this._pool.query(sql, params);
    return result.rows.map(row => ({ id: row.id, data: () => row }));
  }

  async count() {
    let sql = `SELECT COUNT(*) as count FROM "${this._table}"`;
    const params = [];
    if (this._wheres.length > 0) {
      const conditions = this._wheres.map((w, i) => {
        params.push(w.value);
        return `"${w.field}" ${w.op} $${params.length}`;
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    const result = await this._pool.query(sql, params);
    return parseInt(result.rows[0].count, 10);
  }

  _clone() {
    const c = new PostgresCollectionRef(this._pool, this._table);
    c._wheres = [...this._wheres];
    c._orderByClause = this._orderByClause;
    c._limitN = this._limitN;
    return c;
  }
}

class PostgresDocRef {
  constructor(pool, table, id) {
    this._pool = pool;
    this._table = table;
    this._id = id;
  }

  async get() {
    const result = await this._pool.query(`SELECT * FROM "${this._table}" WHERE id = $1`, [this._id]);
    return result.rows[0] || null;
  }

  async set(data) {
    const now = new Date().toISOString();
    const doc = { ...data, id: this._id, updatedAt: now, createdAt: data.createdAt || now };
    const keys = Object.keys(doc);
    const values = Object.values(doc);
    const updates = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const sql = `INSERT INTO "${this._table}" (${keys.map(k => `"${k}"`).join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}) ON CONFLICT (id) DO UPDATE SET ${updates}`;
    await this._pool.query(sql, values);
    return { id: this._id };
  }

  async update(data) {
    const now = new Date().toISOString();
    const doc = { ...data, updatedAt: now };
    const keys = Object.keys(doc);
    const values = Object.values(doc);
    const updates = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const sql = `UPDATE "${this._table}" SET ${updates} WHERE id = $${keys.length + 1}`;
    await this._pool.query(sql, [...values, this._id]);
    return { id: this._id };
  }

  async delete() {
    await this._pool.query(`DELETE FROM "${this._table}" WHERE id = $1`, [this._id]);
    return { id: this._id };
  }
}
