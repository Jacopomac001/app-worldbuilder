const DB_NAME = "worldbuilder-assets";
const STORE_NAME = "images";
const ASSET_PREFIX = "asset://";

function openImageDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Impossibile aprire IndexedDB"));
  });
}

export function isAssetImageRef(value?: string | null): boolean {
  return typeof value === "string" && value.startsWith(ASSET_PREFIX);
}

export function buildAssetImageRef(assetId: string): string {
  return `${ASSET_PREFIX}${assetId}`;
}

export function parseAssetImageRef(value?: string | null): string | null {
  if (!isAssetImageRef(value)) return null;
  return String(value).slice(ASSET_PREFIX.length) || null;
}

async function storeBlob(blob: Blob): Promise<string> {
  const database = await openImageDatabase();

  return new Promise((resolve, reject) => {
    const assetId = crypto.randomUUID();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    transaction.oncomplete = () => {
      database.close();
      resolve(assetId);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Impossibile salvare l'immagine"));
    };

    store.put(blob, assetId);
  });
}

async function readBlob(assetId: string): Promise<Blob | null> {
  const database = await openImageDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(assetId);

    request.onsuccess = () => {
      database.close();
      const result = request.result;
      resolve(result instanceof Blob ? result : null);
    };
    request.onerror = () => {
      database.close();
      reject(request.error ?? new Error("Impossibile leggere l'immagine"));
    };
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",");
  if (parts.length < 2) {
    throw new Error("Data URL non valido");
  }

  const header = parts[0] ?? "";
  const body = parts.slice(1).join(",");
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch?.[1] || "application/octet-stream";
  const binary = window.atob(body);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mime });
}

export async function saveImageFileAsAssetRef(file: File): Promise<string> {
  const assetId = await storeBlob(file);
  return buildAssetImageRef(assetId);
}

export async function saveDataUrlImageAsAssetRef(dataUrl: string): Promise<string> {
  const blob = dataUrlToBlob(dataUrl);
  const assetId = await storeBlob(blob);
  return buildAssetImageRef(assetId);
}

export async function resolveImageRefToSrc(imageRef?: string): Promise<string> {
  if (!imageRef) return "";

  const assetId = parseAssetImageRef(imageRef);
  if (!assetId) return imageRef;

  const blob = await readBlob(assetId);
  if (!blob) return "";

  return URL.createObjectURL(blob);
}

export async function deleteImageAssetByRef(imageRef?: string): Promise<void> {
  const assetId = parseAssetImageRef(imageRef);
  if (!assetId) return;

  const database = await openImageDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Impossibile eliminare l'immagine"));
    };

    store.delete(assetId);
  });
}
