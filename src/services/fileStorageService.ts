import { CompanySettings, DatabaseDump, StorageConfig } from '../types';

const DIRECTORY_HANDLE_KEY = 'transport_selected_dir_handle';
const DB_STORE_NAME = 'transport_storage_handles';
const DB_NAME = 'transport_system_handles_db';

export class FileStorageService {
  /**
   * Check if Native File System Access API is supported (Chrome, Edge, Opera, Desktop PWA)
   */
  public static isFileSystemAccessSupported(): boolean {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  }

  /**
   * Open IndexedDB to store/retrieve FileSystemDirectoryHandle
   */
  private static async openHandleDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DB_STORE_NAME)) {
          db.createObjectStore(DB_STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Store directory handle into IndexedDB
   */
  public static async storeDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
    try {
      const db = await this.openHandleDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(DB_STORE_NAME, 'readwrite');
        const store = tx.objectStore(DB_STORE_NAME);
        const req = store.put(handle, DIRECTORY_HANDLE_KEY);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Could not persist directory handle in IndexedDB:', err);
    }
  }

  /**
   * Retrieve stored directory handle from IndexedDB
   */
  public static async getStoredDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
    try {
      const db = await this.openHandleDb();
      return new Promise((resolve) => {
        const tx = db.transaction(DB_STORE_NAME, 'readonly');
        const store = tx.objectStore(DB_STORE_NAME);
        const req = store.get(DIRECTORY_HANDLE_KEY);
        req.onsuccess = () => {
          resolve((req.result as FileSystemDirectoryHandle) || null);
        };
        req.onerror = () => resolve(null);
      });
    } catch (err) {
      return null;
    }
  }

  /**
   * Clear stored directory handle
   */
  public static async clearStoredDirectoryHandle(): Promise<void> {
    try {
      const db = await this.openHandleDb();
      return new Promise((resolve) => {
        const tx = db.transaction(DB_STORE_NAME, 'readwrite');
        const store = tx.objectStore(DB_STORE_NAME);
        const req = store.delete(DIRECTORY_HANDLE_KEY);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      });
    } catch (err) {
      // ignore
    }
  }

  /**
   * Prompt user to select a folder on their PC/Drive
   */
  public static async pickDirectory(): Promise<{
    handle: FileSystemDirectoryHandle;
    folderName: string;
  }> {
    if (!this.isFileSystemAccessSupported()) {
      throw new Error(
        'File System Access is not supported by your current browser. Please use Chrome, Edge, Brave, or an installable desktop PWA.'
      );
    }

    // @ts-ignore
    const handle: FileSystemDirectoryHandle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents',
    });

    // Verify permission
    const permission = await this.verifyPermission(handle, true);
    if (!permission) {
      throw new Error('Permission to write to the chosen directory was not granted.');
    }

    await this.storeDirectoryHandle(handle);

    return {
      handle,
      folderName: handle.name,
    };
  }

  /**
   * Verify readwrite permission for a handle
   */
  public static async verifyPermission(
    handle: FileSystemDirectoryHandle,
    readWrite: boolean = true
  ): Promise<boolean> {
    const options: any = {};
    if (readWrite) {
      options.mode = 'readwrite';
    }

    // @ts-ignore
    if ((await handle.queryPermission(options)) === 'granted') {
      return true;
    }

    // @ts-ignore
    if ((await handle.requestPermission(options)) === 'granted') {
      return true;
    }

    return false;
  }

  /**
   * Write complete database snapshot into user's chosen PC folder
   */
  public static async syncDatabaseToDirectory(
    dumpJson: string,
    subFolder: string = 'Daily_Backups'
  ): Promise<{
    success: boolean;
    folderName: string;
    bytesWritten: number;
    filePath: string;
    message: string;
  }> {
    const handle = await this.getStoredDirectoryHandle();
    if (!handle) {
      throw new Error('No PC folder has been selected yet. Please select a folder in Settings > Select Storage.');
    }

    const hasPermission = await this.verifyPermission(handle, true);
    if (!hasPermission) {
      throw new Error('Write permission was denied for the selected PC folder. Please re-select the folder.');
    }

    // 1. Write the main live file: transport_database.json
    const liveFileHandle = await handle.getFileHandle('transport_database.json', { create: true });
    // @ts-ignore
    const writableLive = await liveFileHandle.createWritable();
    await writableLive.write(dumpJson);
    await writableLive.close();

    // 2. Also write an info readme metadata file
    try {
      const readmeHandle = await handle.getFileHandle('STORAGE_INFO.txt', { create: true });
      // @ts-ignore
      const writableReadme = await readmeHandle.createWritable();
      const infoText = `TRANSPORT ENTRY SYSTEM - LOCAL PC STORAGE\n` +
        `Folder: ${handle.name}\n` +
        `Last Synced: ${new Date().toLocaleString()}\n` +
        `Live Database: transport_database.json\n` +
        `This folder contains all your offline Bilties, Memos, Parties, Vehicles, and Settings.\n` +
        `Data is saved locally on your PC. No internet connection required!`;
      await writableReadme.write(infoText);
      await writableReadme.close();
    } catch (e) {
      // Non-critical
    }

    // 3. Write a timestamped snapshot inside subFolder (e.g. Daily_Backups)
    try {
      const subDirHandle = await handle.getDirectoryHandle(subFolder || 'Daily_Backups', { create: true });
      const dateStr = new Date().toISOString().substring(0, 10);
      const snapshotFileName = `transport_backup_${dateStr}.json`;
      const snapFileHandle = await subDirHandle.getFileHandle(snapshotFileName, { create: true });
      // @ts-ignore
      const writableSnap = await snapFileHandle.createWritable();
      await writableSnap.write(dumpJson);
      await writableSnap.close();
    } catch (e) {
      console.warn('Subfolder snapshot failed (non-critical):', e);
    }

    const bytesWritten = new Blob([dumpJson]).size;

    return {
      success: true,
      folderName: handle.name,
      bytesWritten,
      filePath: `${handle.name}/transport_database.json`,
      message: `Data successfully saved to PC folder "${handle.name}" (${(bytesWritten / 1024).toFixed(1)} KB)`,
    };
  }

  /**
   * Read database directly from chosen PC folder
   */
  public static async readDatabaseFromDirectory(): Promise<string> {
    const handle = await this.getStoredDirectoryHandle();
    if (!handle) {
      throw new Error('No PC storage folder connected.');
    }

    const hasPermission = await this.verifyPermission(handle, false);
    if (!hasPermission) {
      throw new Error('Read permission denied for selected PC directory.');
    }

    const fileHandle = await handle.getFileHandle('transport_database.json');
    const file = await fileHandle.getFile();
    return await file.text();
  }

  /**
   * Get Browser and Local Storage Estimate (MB used vs available)
   */
  public static async getStorageUsage(): Promise<{
    usedBytes: number;
    quotaBytes: number;
    percentUsed: number;
    usedMb: string;
    quotaMb: string;
    isPersisted: boolean;
  }> {
    let usedBytes = 0;
    let quotaBytes = 0;
    let isPersisted = false;

    if (typeof navigator !== 'undefined' && navigator.storage) {
      try {
        if (navigator.storage.estimate) {
          const est = await navigator.storage.estimate();
          usedBytes = est.usage || 0;
          quotaBytes = est.quota || 0;
        }
        if (navigator.storage.persisted) {
          isPersisted = await navigator.storage.persisted();
        }
      } catch (e) {
        // fallback
      }
    }

    // Also calculate localStorage size
    if (typeof localStorage !== 'undefined') {
      try {
        let lsBytes = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            lsBytes += (key.length + (localStorage.getItem(key) || '').length) * 2;
          }
        }
        if (usedBytes === 0) usedBytes = lsBytes;
      } catch (e) {}
    }

    const percentUsed = quotaBytes > 0 ? (usedBytes / quotaBytes) * 100 : 0;
    const usedMb = (usedBytes / (1024 * 1024)).toFixed(2);
    const quotaMb = quotaBytes > 0 ? (quotaBytes / (1024 * 1024)).toFixed(0) : 'Unlimited';

    return {
      usedBytes,
      quotaBytes,
      percentUsed,
      usedMb,
      quotaMb,
      isPersisted,
    };
  }

  /**
   * Request persistent storage permission so browser never clears data
   */
  public static async requestPersistentStorage(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      return await navigator.storage.persist();
    }
    return false;
  }
}
