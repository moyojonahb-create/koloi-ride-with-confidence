/**
 * Offline ride request queue.
 * When the user is offline, ride requests are saved to IndexedDB
 * and automatically synced when connectivity returns.
 */

const DB_NAME = 'voyex-offline';
const STORE_NAME = 'pending-rides';
const DB_VERSION = 1;

interface PendingRide {
  id: string;
  payload: Record<string, unknown>;
  createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueOfflineRide(payload: Record<string, unknown>): Promise<string> {
  const db = await openDB();
  const id = crypto.randomUUID();
  const ride: PendingRide = { id, payload, createdAt: Date.now() };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(ride);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingRides(): Promise<PendingRide[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function removePendingRide(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingCount(): Promise<number> {
  const rides = await getPendingRides();
  return rides.length;
}
