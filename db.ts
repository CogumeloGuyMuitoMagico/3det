/**
 * db.ts — IndexedDB wrapper for 3DeT Builder
 * Stores:
 *   characters — Character[] (portraits included — no 5MB limit!)
 *   folders    — Folder[]
 *   kv         — generic key-value (diceHistory, notes, …)
 */

import { Character, Folder } from './types';

const DB_NAME    = '3det_builder';
const DB_VERSION = 2;          // bumped to add 'kv' store

let _db: Promise<IDBDatabase> | null = null;

const getDB = (): Promise<IDBDatabase> => {
  if (_db) return _db;
  _db = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db  = req.result;
      const old = e.oldVersion;
      if (old < 1) {
        db.createObjectStore('characters', { keyPath: 'id' });
        db.createObjectStore('folders',    { keyPath: 'id' });
      }
      if (old < 2) {
        db.createObjectStore('kv');   // key-value: notes, diceHistory, …
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => { _db = null; reject(req.error); };
  });
  return _db;
};

// ── Store-of-objects helpers (characters, folders) ───────────────────────────

const readAll = async <T>(store: string): Promise<T[]> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction(store, 'readonly').objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror   = () => reject(req.error);
    });
  } catch { return []; }
};

const writeAll = async (store: string, items: object[]): Promise<void> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const s  = tx.objectStore(store);
      s.clear();
      items.forEach(item => s.put(item));
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  } catch { /* ignore */ }
};

// ── KV helpers ───────────────────────────────────────────────────────────────

export const kvGet = async <T>(key: string): Promise<T | null> => {
  try {
    const db = await getDB();
    return new Promise(resolve => {
      const req = db.transaction('kv', 'readonly').objectStore('kv').get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror   = () => resolve(null);
    });
  } catch { return null; }
};

export const kvSet = async (key: string, value: unknown): Promise<void> => {
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const req = db.transaction('kv', 'readwrite').objectStore('kv').put(value, key);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  } catch (e) { console.warn('[idb] kvSet failed', e); }
};

// ── Public character / folder API ────────────────────────────────────────────

export const loadCharacters = (): Promise<Character[]> =>
  readAll<Character>('characters');

export const saveCharacters = (chars: Character[]): Promise<void> =>
  writeAll('characters', chars);

export const loadFolders = (): Promise<Folder[]> =>
  readAll<Folder>('folders');

export const saveFolders = (folders: Folder[]): Promise<void> =>
  writeAll('folders', folders);

// ── One-time migration from the old localStorage format ──────────────────────

export const migrateFromLocalStorage = async (): Promise<void> => {
  const raw = localStorage.getItem('3det_characters');
  if (!raw) return;

  try {
    const parsed: any[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return;

    const chars: Character[] = parsed.map(c => ({
      ...c,
      portrait:
        localStorage.getItem(`3det_portrait_${c.id}`) ??
        c.portrait ??
        null,
    }));

    await saveCharacters(chars);

    const rawFolders = localStorage.getItem('3det_folders');
    if (rawFolders) await saveFolders(JSON.parse(rawFolders));

    localStorage.removeItem('3det_characters');
    localStorage.removeItem('3det_folders');
    parsed.forEach(c => localStorage.removeItem(`3det_portrait_${c.id}`));
  } catch (e) {
    console.warn('Migração do localStorage falhou (não crítico):', e);
  }
};
