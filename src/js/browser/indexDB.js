function promisifyTransaction(req) {
  return new Promise((res, rej, onCancel) => {
    req.onsuccess = () => {
      res(req.result)
    }
    req.onerror = () => {
      rej(req.error)
    }
    onCancel(() => req.transaction.abort())
  })
}

class SoDB {
  constructor(name, tables) {
    this._db = null
    this._dbName = name
    this._resolveDbPromise = this.connect(undefined, (db) => {
      tables.forEach((table) => {
        if (!db.objectStoreNames.contains(table)) db.createObjectStore(table)
      })
    })
  }

  /**
   * @param {number} version
   * @param {(db: IDBDatabase) => any} handleUpgrade
   * @return {Promise<IDBDatabase>}
   */
  connect(version = undefined, handleUpgrade = () => {}) {
    if (this._db && (!version || (version && version === this._db.version))) return this._resolveDbPromise
    else {
      this._resolveDbPromise = new Promise((res, rej) => {
        const req = indexedDB.open(this._dbName, version)
        req.onsuccess = () => {
          this._db = req.result
          res(this._db)
        }
        req.onblocked = () => {
          this._db.close()
          this._db = null
        }
        req.onerror = () => {
          rej(req.error)
        }
        req.onupgradeneeded = () => {
          handleUpgrade.call(this, req.result)
        }
      })
      return this._resolveDbPromise
    }
  }

  /**
   * @param {string} storeName
   */
  dropTable(storeName) {
    return this.connect().then((db) => {
      if (db.objectStoreNames.contains(storeName)) {
        return this.connect(db.version + 1, (db) => {
          db.deleteObjectStore(storeName)
        })
      }
      return db
    })
  }

  /**
   * @param {string} storeName
   * @param {string} key
   */
  set(storeName, key, value) {
    return this.connect().then((db) => {
      if (db.objectStoreNames.contains(storeName)) {
        const transaction = db.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)
        return promisifyTransaction(store.getKey(key)).then((ret) =>
          promisifyTransaction(store[ret ? 'put' : 'add'](value, key))
        )
      } else {
        return this.connect(db.version + 1, (db) => {
          db.createObjectStore(storeName)
        }).then(() => this.set(storeName, key, value))
      }
    })
  }

  /**
   * @param {string} storeName
   * @param {string} key
   */
  get(storeName, key) {
    return this.connect().then((db) => {
      if (db.objectStoreNames.contains(storeName)) {
        const transaction = db.transaction(storeName, 'readonly')
        const store = transaction.objectStore(storeName)
        return promisifyTransaction(store.get(key))
      } else return Promise.resolve()
    })
  }
}

export default SoDB
