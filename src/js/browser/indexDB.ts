function promisifyTransaction<T>(req: IDBRequest): Promise<T> {
  return new Promise((res, rej) => {
    req.onsuccess = () => {
      res(req.result)
    }
    req.onerror = () => {
      rej(req.error)
    }
  })
}

class SoDB {
  private _db: IDBDatabase | null
  private _dbName: string
  private _version?: number
  private _resolveDbPromise?: Promise<IDBDatabase>
  constructor(name: string, version?: number) {
    this._db = null
    this._dbName = name
    this._version = version
  }

  connect(
    handleUpgrade: (e: { db: IDBDatabase; transaction: IDBTransaction | null }) => any = () => {
      //
    },
    version?: number
  ): Promise<IDBDatabase> {
    if (this._db && (!this._version || (this._version && this._version === this._db.version)))
      return this._resolveDbPromise!
    else {
      this._resolveDbPromise = new Promise((res, rej) => {
        const req = indexedDB.open(this._dbName, version)
        req.onsuccess = () => {
          this._db = req.result
          this._version = this._db.version
          res(this._db)
        }
        req.onblocked = () => {
          this._db && this._db.close()
          this._db = null
        }
        req.onerror = () => {
          rej(req.error)
        }
        req.onupgradeneeded = () => {
          handleUpgrade.call(this, {
            db: req.result,
            transaction: req.transaction
          })
        }
      })
      return this._resolveDbPromise
    }
  }

  set<T>(storeName: string, key: string, value: T): Promise<IDBValidKey> {
    return this.connect().then((db) => {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      return promisifyTransaction<IDBValidKey>(store.get(key)).then((ret) => {
        return promisifyTransaction(store[ret ? 'put' : 'add'](value, key))
      })
    })
  }

  /**
   * @param {string} storeName
   * @param {string} key
   */
  get<T>(storeName: string, key: string): Promise<T | void> {
    return this.connect().then<T | void>((db) => {
      if (db.objectStoreNames.contains(storeName)) {
        const transaction = db.transaction(storeName, 'readonly')
        const store = transaction.objectStore(storeName)
        return promisifyTransaction<T>(store.get(key))
      } else return Promise.resolve()
    })
  }

  delete(storeName: string, key: string): Promise<void> {
    return this.connect().then((db) => {
      if (db.objectStoreNames.contains(storeName)) {
        const transaction = db.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)
        return promisifyTransaction(store.delete(key))
      } else return Promise.resolve()
    })
  }

  async getRange<T>(
    storeName: string,
    offset: number,
    size: number,
    { index, order = 'next' }: { index?: string; order?: 'next' | 'prev' } = {}
  ): Promise<T[]> {
    const db = await this.connect()
    const store = db.transaction(storeName).objectStore(storeName)
    const cursorReq = index ? store.index(index).openCursor(undefined, order) : store.openCursor(undefined, order)
    const ret: T[] = []
    let i = 0
    let hasAdvanced = offset ? false : true
    await new Promise((res) => {
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result
        if (cursor && (size == -1 || i < size)) {
          if (!hasAdvanced) {
            cursor.advance(offset)
            hasAdvanced = true
          } else {
            i++
            ret.push(cursor.value)
            cursor.continue()
          }
        } else {
          res(ret)
        }
      }

      cursorReq.onerror = () => {
        res(ret)
      }
    })
    return ret
  }

  teardown() {
    return promisifyTransaction(indexedDB.deleteDatabase(this._dbName))
  }
}

export const isIndexDBAvailable = () => 'indexedDB' in window

export default SoDB
