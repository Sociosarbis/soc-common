function promisifyTransaction<T>(req: IDBRequest): Promise<T> {
  return new Promise((res, rej) => {
    req.onsuccess = () => {
      res(req.result);
    };
    req.onerror = () => {
      rej(req.error);
    };
  });
}

type Index = {
  keyPath: string[] | string;
  name: string;
  unique?: boolean;
};

export type Table = {
  name: string;
  indices?: Index[];
};

function isIndexHasChanged(index1: Index, index2: Index) {
  if (index1.unique !== index2.unique) return true;
  if (index1.keyPath === index2.keyPath) return false;
  if (Array.isArray(index1.keyPath) && Array.isArray(index2.keyPath))
    return (
      index1.keyPath.findIndex((key, i) => index2.keyPath[i] !== key) !== -1
    );
  return true;
}

class SoDB<T> {
  private _db: IDBDatabase | null;
  private _dbName: string;
  private _resolveDbPromise: Promise<IDBDatabase>;
  constructor(name: string, tables: (string | Table)[]) {
    this._db = null;
    this._dbName = name;
    this._resolveDbPromise = this.connect(undefined, (db) => {
      tables.forEach((pTable) => {
        const table = typeof pTable === 'string' ? { name: pTable } : pTable;
        const t = !db.objectStoreNames.contains(table.name)
          ? db.createObjectStore(table.name)
          : db.transaction(table.name, 'readwrite').objectStore(table.name);
        if ('indices' in table) {
          table.indices?.forEach((i) => {
            if (t.indexNames.contains(i.name)) {
              const oldIndex = t.index(i.name);
              if (isIndexHasChanged(i, oldIndex)) {
                t.deleteIndex(oldIndex.name);
              } else return;
            }
            t.createIndex(i.name, i.keyPath, {
              unique: i.unique,
              multiEntry: Array.isArray(i.keyPath),
            });
          });
        }
      });
    });
  }

  connect(
    version: number | undefined = undefined,
    handleUpgrade: (db: IDBDatabase) => any = () => {
      /**/
    },
  ): Promise<IDBDatabase> {
    if (this._db && (!version || (version && version === this._db.version)))
      return this._resolveDbPromise;
    else {
      this._resolveDbPromise = new Promise((res, rej) => {
        const req = indexedDB.open(this._dbName, version);
        req.onsuccess = () => {
          this._db = req.result;
          res(this._db);
        };
        req.onblocked = () => {
          this._db && this._db.close();
          this._db = null;
        };
        req.onerror = () => {
          rej(req.error);
        };
        req.onupgradeneeded = () => {
          handleUpgrade.call(this, req.result);
        };
      });
      return this._resolveDbPromise;
    }
  }

  dropTable(storeName: string) {
    return this.connect().then((db) => {
      if (db.objectStoreNames.contains(storeName)) {
        return this.connect(db.version + 1, (db) => {
          db.deleteObjectStore(storeName);
        });
      }
      return db;
    });
  }

  set(storeName: string, key: string, value: T): Promise<IDBValidKey> {
    return this.connect().then((db) => {
      if (db.objectStoreNames.contains(storeName)) {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        return promisifyTransaction<IDBValidKey>(
          store.getKey(key),
        ).then((ret) =>
          promisifyTransaction(store[ret ? 'put' : 'add'](value, key)),
        );
      } else {
        return this.connect(db.version + 1, (db) => {
          db.createObjectStore(storeName);
        }).then(() => this.set(storeName, key, value));
      }
    });
  }

  get(storeName: string, key: string): Promise<T | void> {
    return this.connect().then<T | void>((db) => {
      if (db.objectStoreNames.contains(storeName)) {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        return promisifyTransaction<T>(store.get(key));
      } else return Promise.resolve();
    });
  }

  async getRange(
    storeName: string,
    offset: number,
    size: number,
    { index, order }: { index?: string; order?: 'next' | 'prev' } = {},
  ): Promise<T[]> {
    const db = await this.connect();
    const store = db.transaction(storeName).objectStore(storeName);
    const cursorReq = index
      ? store.index(index).openCursor(undefined, order)
      : store.openCursor(undefined, order);
    const ret: T[] = [];
    let i = 0;
    let hasAdvanced = offset ? false : true;
    await new Promise((res) => {
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor && i < size) {
          if (!hasAdvanced) {
            cursor.advance(offset);
            hasAdvanced = true;
          } else {
            i++;
            ret.push(cursor.value);
            cursor.continue();
          }
        } else {
          res(ret);
        }
      };

      cursorReq.onerror = () => {
        res(ret);
      };
    });
    return ret;
  }
}

export default SoDB;
