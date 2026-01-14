const DB_NAME = 'seo_writer_images';
const STORE_NAME = 'images';
const DB_VERSION = 1;

export interface ImageRecord {
  id: string;
  prompt: string;
  base64: string;
  createdAt: number;
  articleId?: string; // Optional link to an article
}

class ImageDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('prompt', 'prompt', { unique: false });
        }
      };
    });
  }

  async saveImage(prompt: string, base64: string): Promise<string> {
    await this.init();
    // Create a deterministic ID based on prompt to avoid duplicates for exact same prompt
    // Or use UUID if we want duplicates. Let's use simple hash of prompt for dedupe or UUID.
    // For now, let's use UUID to allow multiple variations of same prompt if needed, 
    // BUT Writer.tsx uses prompt as key. So we should probably use prompt as ID or unique index.
    // To support Writer.tsx logic, let's just store it.
    
    const id = btoa(encodeURIComponent(prompt)).slice(0, 32); // Simple hash-like ID from prompt
    
    const record: ImageRecord = {
      id,
      prompt,
      base64,
      createdAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(record);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async getImage(id: string): Promise<ImageRecord | undefined> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  async getImageByPrompt(prompt: string): Promise<ImageRecord | undefined> {
      // Since we use prompt-based ID logic above, we can just get by ID
      const id = btoa(encodeURIComponent(prompt.trim())).slice(0, 32);
      return this.getImage(id);
  }

  async getAllImages(): Promise<ImageRecord[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('createdAt');
      const request = index.openCursor(null, 'prev'); // Newest first
      
      const results: ImageRecord[] = [];
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteImage(id: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  async clearAll(): Promise<void> {
      await this.init();
      return new Promise((resolve, reject) => {
          const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
  }
}

export const imageDb = new ImageDB();
