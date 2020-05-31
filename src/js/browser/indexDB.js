class SoDB {
  constructor(name) {
    this._db = null
    this._dbName = name
    this.connect()
  }

  /**
   * @param {(db: IDBDatabase) => any} handleUpgrade
   * @return {Promise<IDBDatabase>}
   */
  connect(version = 1, handleUpgrade = () => {}) {
    if (this._db && (!version || (version && version === this._db.version))) return Promise.resolve(this._db)
    else {
      return new Promise((res, rej) => {
        const req = indexedDB.open(this._dbName, version)
        req.onsuccess = () => {
          this._db = req.result
          res(this._db)
        }
        req.onerror = () => {
          rej(req.error)
        }
        req.onupgradeneeded = () => {
          handleUpgrade.call(this, req.result)
        }
      })
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
  set(storeName, key) {
    return this.connect().then((db) => {
      if (db.objectStoreNames.contains(storeName)) {
        const transaction = db.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)
        return new Promise(function (res, rej) {
          const req = store.get(key)
          req.onsuccess = function () {
            res(db)
          }
          req.onerror = function () {
            rej(req.error)
          }
        })
      } else {
        return this.connect(db.version + 1, (db) => {
          db.createObjectStore(storeName)
        }).then(() => this.set(storeName, key))
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
        return new Promise(function (res, rej) {
          const req = store.get(key)
          req.onsuccess = function () {
            res(req.result)
          }
          req.onerror = function () {
            rej(req.error)
          }
        })
      } else return Promise.resolve()
    })
  }
}

export default SoDB
