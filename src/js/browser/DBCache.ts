import DB from './indexDB'

type DBCacheItem = {
  key: string
  timestamp: number
  blob: PlainBlob
}

type PlainBlob = {
  type: string
  buffer: ArrayBuffer
}

export default class DBCache {
  private _db: DB
  storeName: string
  version: number
  scope = 'app-cache'
  maxEntries?: number
  constructor(storeName: string, version: number, options?: { scope: string; maxEntries?: number }) {
    this.storeName = storeName
    this.version = version
    this.maxEntries = options?.maxEntries
    this._db = new DB(storeName, version)
  }

  async connect() {
    const db = await this._db.connect(({ db, transaction }) => {
      const objectStore = !db.objectStoreNames.contains(this.scope)
        ? db.createObjectStore(this.scope)
        : transaction?.objectStore(this.scope)
      if (objectStore) {
        if (!objectStore.indexNames.contains('timestamp')) {
          objectStore.createIndex('timestamp', 'timestamp')
        }
      }
    })
    return db
  }

  async set(key: string, data: PlainBlob) {
    const result = await this._db.get<DBCacheItem>(this.scope, key)
    if (!result && this.maxEntries) {
      const items = await this._db.getRange<DBCacheItem>(this.scope, this.maxEntries, -1, { index: 'timestamp' })
      for (const item of items) {
        this._db.delete(this.scope, item.key)
      }
    }
    await this._db.set(this.scope, key, {
      key,
      timestamp: new Date().valueOf(),
      blob: data
    })
  }

  async get(key: string) {
    const result = await this._db.get<DBCacheItem>(this.scope, key)
    if (result) {
      await this._db.set(this.scope, key, {
        timestamp: new Date().valueOf(),
        blob: result.blob
      })
      return result.blob
    }
  }
}
