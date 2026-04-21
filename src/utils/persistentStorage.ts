const PERSISTENCE_DB_NAME = "worldbuilder_persistence";
const PERSISTENCE_STORE_NAME = "keyval";

function openPersistenceDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(PERSISTENCE_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PERSISTENCE_STORE_NAME)) {
        db.createObjectStore(PERSISTENCE_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Impossibile aprire IndexedDB"));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> {
  const db = await openPersistenceDb();

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(PERSISTENCE_STORE_NAME, mode);
    const store = transaction.objectStore(PERSISTENCE_STORE_NAME);

    Promise.resolve(run(store))
      .then((result) => {
        transaction.oncomplete = () => {
          db.close();
          resolve(result);
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error ?? new Error("Errore transazione IndexedDB"));
        };
        transaction.onabort = () => {
          db.close();
          reject(transaction.error ?? new Error("Transazione IndexedDB interrotta"));
        };
      })
      .catch((error) => {
        db.close();
        reject(error);
      });
  });
}

export async function readPersistedValue<T>(key: string): Promise<T | undefined> {
  return withStore("readonly", (store) => {
    return new Promise<T | undefined>((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () =>
        reject(request.error ?? new Error("Impossibile leggere il valore persistito"));
    });
  });
}

export async function writePersistedValue<T>(key: string, value: T): Promise<void> {
  return withStore("readwrite", (store) => {
    return new Promise<void>((resolve, reject) => {
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(request.error ?? new Error("Impossibile salvare il valore persistito"));
    });
  });
}

export async function removePersistedValue(key: string): Promise<void> {
  return withStore("readwrite", (store) => {
    return new Promise<void>((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(request.error ?? new Error("Impossibile rimuovere il valore persistito"));
    });
  });
}
