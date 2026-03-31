export type ImageAssetExport = {
  id: string;
  dataUrl: string;
  mimeType?: string;
};

const IMAGE_DB_NAME = "worldbuilder-assets";
const IMAGE_STORE_NAME = "images";
const IMAGE_ASSET_PREFIX = "asset://";

function openImageAssetDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(IMAGE_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        database.createObjectStore(IMAGE_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Impossibile aprire IndexedDB"));
  });
}

export function isAssetImageRef(value?: string | null): boolean {
  return typeof value === "string" && value.startsWith(IMAGE_ASSET_PREFIX);
}

export function buildAssetImageRef(assetId: string): string {
  return `${IMAGE_ASSET_PREFIX}${assetId}`;
}

export function parseAssetImageRef(value?: string | null): string | null {
  if (!isAssetImageRef(value)) return null;
  const parsed = String(value).slice(IMAGE_ASSET_PREFIX.length);
  return parsed || null;
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",");
  if (parts.length < 2) {
    throw new Error("Data URL non valido");
  }

  const header = parts[0] ?? "";
  const body = parts.slice(1).join(",");
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mimeType = mimeMatch?.[1] || "application/octet-stream";
  const binary = window.atob(body);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Impossibile convertire il blob in data URL"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Errore FileReader"));
    reader.readAsDataURL(blob);
  });
}

export async function getImageBlobByAssetId(assetId: string): Promise<Blob | null> {
  const database = await openImageAssetDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(IMAGE_STORE_NAME, "readonly");
    const store = transaction.objectStore(IMAGE_STORE_NAME);
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

export async function putImageBlob(blob: Blob, forcedId?: string): Promise<string> {
  const database = await openImageAssetDatabase();

  return new Promise((resolve, reject) => {
    const assetId = forcedId ?? crypto.randomUUID();
    const transaction = database.transaction(IMAGE_STORE_NAME, "readwrite");
    const store = transaction.objectStore(IMAGE_STORE_NAME);

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

export async function saveDataUrlImageAsAssetRef(dataUrl: string): Promise<string> {
  const blob = dataUrlToBlob(dataUrl);
  const assetId = await putImageBlob(blob);
  return buildAssetImageRef(assetId);
}

export async function saveImageFileAsAssetRef(file: File): Promise<string> {
  const assetId = await putImageBlob(file);
  return buildAssetImageRef(assetId);
}

export async function deleteImageAssetByRef(imageRef?: string | null): Promise<void> {
  const assetId = parseAssetImageRef(imageRef);
  if (!assetId) return;

  const database = await openImageAssetDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(IMAGE_STORE_NAME, "readwrite");
    const store = transaction.objectStore(IMAGE_STORE_NAME);
    const request = store.delete(assetId);

    request.onsuccess = () => {
      database.close();
      resolve();
    };
    request.onerror = () => {
      database.close();
      reject(request.error ?? new Error("Impossibile cancellare l'immagine"));
    };
  });
}

export async function resolveImageRefToSrc(imageRef?: string | null): Promise<string | null> {
  if (!imageRef) return null;

  if (!isAssetImageRef(imageRef)) {
    return imageRef;
  }

  const assetId = parseAssetImageRef(imageRef);
  if (!assetId) return null;

  const blob = await getImageBlobByAssetId(assetId);
  if (!blob) return null;

  return URL.createObjectURL(blob);
}

export async function collectImageAssetsForExport(imageRefs: string[]): Promise<ImageAssetExport[]> {
  const uniqueAssetIds = Array.from(
    new Set(
      imageRefs
        .map((imageRef) => parseAssetImageRef(imageRef))
        .filter((assetId): assetId is string => Boolean(assetId))
    )
  );

  const assets = await Promise.all(
    uniqueAssetIds.map(async (assetId): Promise<ImageAssetExport | null> => {
      const blob = await getImageBlobByAssetId(assetId);
      if (!blob) return null;

      return {
        id: assetId,
        dataUrl: await blobToDataUrl(blob),
        mimeType: blob.type || undefined,
      };
    })
  );

  return assets.filter((asset): asset is ImageAssetExport => asset !== null);
}

export async function importImageAssetsFromWorldData(
  imageAssets?: Array<{ id: string; dataUrl: string; mimeType?: string }>
): Promise<void> {
  if (!Array.isArray(imageAssets) || imageAssets.length === 0) return;

  for (const asset of imageAssets) {
    if (!asset || typeof asset.id !== "string" || typeof asset.dataUrl !== "string") {
      continue;
    }

    const blob = dataUrlToBlob(asset.dataUrl);
    await putImageBlob(blob, asset.id);
  }
}

export async function deleteAllImageAssets(): Promise<void> {
  const database = await openImageAssetDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(IMAGE_STORE_NAME, "readwrite");
    const store = transaction.objectStore(IMAGE_STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      database.close();
      resolve();
    };
    request.onerror = () => {
      database.close();
      reject(request.error ?? new Error("Impossibile cancellare le immagini"));
    };
  });
}
