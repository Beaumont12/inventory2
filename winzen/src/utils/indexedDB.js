// src/utils/indexedDB.js
import { openDB } from 'idb';

// Open or create the database
const dbPromise = openDB('products-db', 1, {
  upgrade(db) {
    // Create object stores if they don't exist
    if (!db.objectStoreNames.contains('products')) {
      db.createObjectStore('products');
    }
    if (!db.objectStoreNames.contains('categories')) {
      db.createObjectStore('categories');
    }
  },
});

// Store data in IndexedDB
export const setIndexedDB = async (storeName, key, value) => {
  const db = await dbPromise;
  return db.put(storeName, value, key);
};

// Get data from IndexedDB
export const getIndexedDB = async (storeName, key) => {
  const db = await dbPromise;
  return db.get(storeName, key);
};

// Delete data from IndexedDB
export const deleteIndexedDB = async (storeName, key) => {
    const db = await dbPromise;
    return db.delete(storeName, key);
  };