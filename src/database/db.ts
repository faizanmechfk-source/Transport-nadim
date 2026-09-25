import {
  AuditLog,
  AutoBackupConfig,
  AutoBackupSnapshot,
  Bilty,
  ClosedMonthRecord,
  CompanySettings,
  DatabaseDump,
  Driver,
  MatchEntry,
  MedicalEntry,
  MedicalMatchEntry,
  Memo,
  OperatingCity,
  Party,
  QuickRoute,
  Role,
  StorageConfig,
  UserSession,
  Vehicle
} from '../types';
import {
  defaultCompanySettings,
  defaultOperatingCities,
  defaultQuickRoutes,
  demoBilties,
  demoDrivers,
  demoMatchEntries,
  demoMedicalEntries,
  demoMedicalMatchEntries,
  demoMemos,
  demoParties,
  demoVehicles,
} from './seedData';
import { FileStorageService } from '../services/fileStorageService';

const DB_NAME = 'transport_entry_db';
const DB_VERSION = 1;
const STORAGE_PREFIX = 'te_db_';

class TransportDatabase {
  private db: IDBDatabase | null = null;
  private isReady = false;
  private initPromise: Promise<void> | null = null;
  private currentUser: UserSession = {
    id: 'usr-admin',
    name: 'Admin User',
    role: 'admin',
  };

  constructor() {
    this.initPromise = this.init();
  }

  public getCurrentUser(): UserSession {
    return this.currentUser;
  }

  public setCurrentUser(user: UserSession) {
    this.currentUser = user;
    localStorage.setItem('te_current_user', JSON.stringify(user));
  }

  public async init(): Promise<void> {
    const savedUser = localStorage.getItem('te_current_user');
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
      } catch (e) {
        // ignore
      }
    }

    if (!window.indexedDB) {
      console.warn('IndexedDB not supported, falling back to LocalStorage');
      this.initFallback();
      this.isReady = true;
      return;
    }

    return new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.warn('Failed to open IndexedDB, using LocalStorage fallback');
        this.initFallback();
        this.isReady = true;
        resolve();
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isReady = true;
        this.ensureInitialData().then(resolve);
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const stores = [
          'parties',
          'vehicles',
          'drivers',
          'bilties',
          'memos',
          'medicalEntries',
          'matchEntries',
          'medicalMatchEntries',
          'closedMonths',
          'auditLogs',
          'settings',
        ];

        stores.forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        });
      };
    });
  }

  private initFallback() {
    if (!localStorage.getItem(STORAGE_PREFIX + 'settings')) {
      localStorage.setItem(STORAGE_PREFIX + 'settings', JSON.stringify([{ id: 'default', ...defaultCompanySettings }]));
      localStorage.setItem(STORAGE_PREFIX + 'parties', JSON.stringify(demoParties));
      localStorage.setItem(STORAGE_PREFIX + 'vehicles', JSON.stringify(demoVehicles));
      localStorage.setItem(STORAGE_PREFIX + 'drivers', JSON.stringify(demoDrivers));
      localStorage.setItem(STORAGE_PREFIX + 'bilties', JSON.stringify(demoBilties));
      localStorage.setItem(STORAGE_PREFIX + 'memos', JSON.stringify(demoMemos));
      localStorage.setItem(STORAGE_PREFIX + 'medicalEntries', JSON.stringify(demoMedicalEntries));
      localStorage.setItem(STORAGE_PREFIX + 'matchEntries', JSON.stringify(demoMatchEntries));
      localStorage.setItem(STORAGE_PREFIX + 'medicalMatchEntries', JSON.stringify(demoMedicalMatchEntries));
      localStorage.setItem(STORAGE_PREFIX + 'closedMonths', JSON.stringify([]));
      localStorage.setItem(STORAGE_PREFIX + 'auditLogs', JSON.stringify([
        {
          id: 'log-1',
          timestamp: new Date().toISOString(),
          user: 'Admin',
          action: 'System Initialized',
          module: 'System',
          recordId: 'INIT',
          newValue: 'Application database initialized with demo records',
        },
      ]));
    }
  }

  private async ensureInitialData() {
    const settings = await this.getAll<CompanySettings>('settings');
    if (!settings || settings.length === 0) {
      await this.saveItem('settings', { id: 'default', ...defaultCompanySettings });
      for (const p of demoParties) await this.saveItem('parties', p);
      for (const v of demoVehicles) await this.saveItem('vehicles', v);
      for (const d of demoDrivers) await this.saveItem('drivers', d);
      for (const b of demoBilties) await this.saveItem('bilties', b);
      for (const m of demoMemos) await this.saveItem('memos', m);
      for (const me of demoMedicalEntries) await this.saveItem('medicalEntries', me);
      for (const mt of demoMatchEntries) await this.saveItem('matchEntries', mt);
      for (const mmt of demoMedicalMatchEntries) await this.saveItem('medicalMatchEntries', mmt);
      await this.logAudit('System Initialized', 'System', 'INIT', undefined, 'Initial setup complete');
    }
  }

  // Generic DB Operations
  private async getAll<T>(storeName: string): Promise<T[]> {
    if (this.initPromise && !this.isReady) {
      await this.initPromise;
    }
    if (!this.db) {
      const raw = localStorage.getItem(STORAGE_PREFIX + storeName);
      return raw ? JSON.parse(raw) : [];
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => {
          const raw = localStorage.getItem(STORAGE_PREFIX + storeName);
          resolve(raw ? JSON.parse(raw) : []);
        };
      } catch (err) {
        // Fallback
        const raw = localStorage.getItem(STORAGE_PREFIX + storeName);
        resolve(raw ? JSON.parse(raw) : []);
      }
    });
  }

  private syncTimer: any = null;

  public triggerAutoStorageSync() {
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(async () => {
      try {
        const settings = await this.getSettings();
        if (settings.storageConfig?.autoSyncToFileSystem && settings.storageConfig.hasDirectoryPermission) {
          const dump = await this.createBackup();
          const jsonStr = JSON.stringify(dump, null, 2);
          const res = await FileStorageService.syncDatabaseToDirectory(
            jsonStr,
            settings.storageConfig.backupSubFolder || 'Daily_Backups'
          );
          if (res.success) {
            settings.storageConfig.lastSyncedAt = new Date().toISOString();
            settings.storageConfig.lastSyncStatus = 'success';
            settings.storageConfig.lastSyncMessage = res.message;
            await this.saveItem('settings', { id: 'default', ...settings });
          }
        }
      } catch (e) {
        // Silently skip if user has not picked folder yet
      }
    }, 2000);
  }

  private async saveItem<T extends { id: string }>(storeName: string, item: T): Promise<T> {
    if (this.initPromise && !this.isReady) {
      await this.initPromise;
    }

    // Always maintain LocalStorage mirror to avoid desynchronization across sessions/reloads
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + storeName);
      const list: T[] = raw ? JSON.parse(raw) : [];
      const index = list.findIndex((x) => x.id === item.id);
      if (index >= 0) list[index] = item;
      else list.push(item);
      localStorage.setItem(STORAGE_PREFIX + storeName, JSON.stringify(list));
    } catch (e) {
      // ignore quota limits if any
    }

    if (!this.db) {
      if (storeName !== 'settings' && storeName !== 'auditLogs') {
        this.triggerAutoStorageSync();
      }
      return item;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(item);
        req.onsuccess = () => {
          if (storeName !== 'settings' && storeName !== 'auditLogs') {
            this.triggerAutoStorageSync();
          }
          resolve(item);
        };
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  private async removeItem(storeName: string, id: string): Promise<void> {
    if (this.initPromise && !this.isReady) {
      await this.initPromise;
    }

    // Always mirror deletion in LocalStorage
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + storeName);
      if (raw) {
        const list: { id: string }[] = JSON.parse(raw);
        const filtered = list.filter((x) => x.id !== id);
        localStorage.setItem(STORAGE_PREFIX + storeName, JSON.stringify(filtered));
      }
    } catch (e) {
      // ignore
    }

    if (!this.db) {
      if (storeName !== 'settings' && storeName !== 'auditLogs') {
        this.triggerAutoStorageSync();
      }
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(id);
        req.onsuccess = () => {
          if (storeName !== 'settings' && storeName !== 'auditLogs') {
            this.triggerAutoStorageSync();
          }
          resolve();
        };
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  // AUDIT LOGGING
  public async logAudit(action: string, module: string, recordId: string, oldValue?: string, newValue?: string) {
    const log: AuditLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      user: this.currentUser.name + ` (${this.currentUser.role.toUpperCase()})`,
      action,
      module,
      recordId,
      oldValue,
      newValue,
    };
    await this.saveItem('auditLogs', log);
  }

  public async getAuditLogs(): Promise<AuditLog[]> {
    const logs = await this.getAll<AuditLog>('auditLogs');
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // SETTINGS
  public async getSettings(): Promise<CompanySettings> {
    const list = await this.getAll<CompanySettings & { id: string }>('settings');
    if (list && list.length > 0) {
      const saved = list[0];
      const deletedCityNames = new Set(
        (saved.deletedCityNames || []).map((n) => n.trim().toLowerCase())
      );

      // Extract operating cities: prioritize saved array (even if empty) over default
      let cities: OperatingCity[];
      if (Array.isArray(saved.operatingCities)) {
        cities = (saved.operatingCities as any[]).map((c, i) =>
          typeof c === 'string'
            ? { id: `ct-${i}-${String(c).toLowerCase()}`, name: String(c), isHub: false, showOnHomeShortcut: true }
            : { ...c, showOnHomeShortcut: c.showOnHomeShortcut ?? true }
        );
      } else {
        cities = defaultCompanySettings.operatingCities || [];
      }

      // Enforce permanent deletion: filter out any city whose name is in deletedCityNames
      const activeCities = cities.filter(
        (c) => !deletedCityNames.has((c.name || '').trim().toLowerCase())
      );

      return {
        ...defaultCompanySettings,
        ...saved,
        operatingCities: activeCities,
        deletedCityNames: Array.from(deletedCityNames),
        quickRoutes: Array.isArray(saved.quickRoutes)
          ? saved.quickRoutes
          : defaultCompanySettings.quickRoutes,
        autoBackupConfig: saved.autoBackupConfig
          ? { ...defaultCompanySettings.autoBackupConfig, ...saved.autoBackupConfig }
          : defaultCompanySettings.autoBackupConfig,
        storageConfig: saved.storageConfig
          ? { ...defaultCompanySettings.storageConfig, ...saved.storageConfig }
          : defaultCompanySettings.storageConfig,
      };
    }
    return defaultCompanySettings;
  }

  public async updateSettings(settings: CompanySettings): Promise<void> {
    const current = await this.getSettings();

    // Preserve deleted cities blacklist
    const mergedDeletedCities = Array.from(
      new Set([
        ...(current.deletedCityNames || []),
        ...(settings.deletedCityNames || []),
      ])
    ).filter(Boolean);

    const deletedSet = new Set(mergedDeletedCities.map((n) => n.trim().toLowerCase()));

    // Merge operating cities safely: if explicitly passed an array, use it; else retain current
    const candidateCities = Array.isArray(settings.operatingCities)
      ? settings.operatingCities
      : (Array.isArray(current.operatingCities) ? current.operatingCities : defaultOperatingCities);

    const normalizedCities = (candidateCities as any[]).map((c, i) =>
      typeof c === 'string'
        ? { id: `ct-${i}-${String(c).toLowerCase()}`, name: String(c), isHub: false, showOnHomeShortcut: true }
        : { ...c, showOnHomeShortcut: c.showOnHomeShortcut ?? true }
    );

    const finalCities = normalizedCities.filter(
      (c) => !deletedSet.has((c.name || '').trim().toLowerCase())
    );

    const merged: CompanySettings = {
      ...current,
      ...settings,
      operatingCities: finalCities,
      deletedCityNames: mergedDeletedCities,
      quickRoutes: Array.isArray(settings.quickRoutes)
        ? settings.quickRoutes
        : (Array.isArray(current.quickRoutes) ? current.quickRoutes : defaultQuickRoutes),
    };

    await this.saveItem('settings', { id: 'default', ...merged });
    await this.logAudit('Updated Settings', 'Settings', 'default', undefined, merged.companyName);
  }

  public async permanentlyDeleteOperatingCity(cityId: string, cityName: string): Promise<OperatingCity[]> {
    const settings = await this.getSettings();
    const targetId = (cityId || '').trim();
    const targetName = (cityName || '').trim().toLowerCase();

    const currentCities = Array.isArray(settings.operatingCities)
      ? settings.operatingCities
      : defaultOperatingCities;

    const remaining = currentCities.filter((c: OperatingCity | string) => {
      const cId = typeof c === 'string' ? '' : (c.id || '').trim();
      const cName = (typeof c === 'string' ? c : (c.name || '')).trim().toLowerCase();
      if (targetId && cId === targetId) return false;
      if (targetName && cName === targetName) return false;
      return true;
    });

    const deletedNames = Array.from(
      new Set([
        ...(settings.deletedCityNames || []),
        targetName,
      ])
    ).filter(Boolean);

    const updatedSettings: CompanySettings = {
      ...settings,
      operatingCities: remaining,
      deletedCityNames: deletedNames,
    };

    await this.updateSettings(updatedSettings);
    await this.logAudit(
      'Permanently Deleted Operating City',
      'Settings',
      cityId || targetName,
      cityName,
      `Removed "${cityName}" from operating cities`
    );

    return remaining;
  }

  // PARTIES
  public async getParties(includeDeleted = false): Promise<Party[]> {
    const all = await this.getAll<Party>('parties');
    return includeDeleted ? all : all.filter((p) => !p.isDeleted);
  }

  public async saveParty(party: Partial<Party>): Promise<Party> {
    if (!party.name || !party.name.trim()) {
      throw new Error('Party name is required.');
    }
    const partyName = party.name.trim();
    const now = new Date().toISOString();
    const existingParties = await this.getParties(true);

    // Duplicate check on name
    const duplicate = existingParties.find(
      (p) => p.name.trim().toLowerCase() === partyName.toLowerCase() && p.id !== party.id && !p.isDeleted
    );
    if (duplicate) {
      throw new Error(`A party named "${partyName}" already exists.`);
    }

    if (party.id) {
      const existing = existingParties.find((p) => p.id === party.id);
      const updated: Party = {
        ...existing!,
        ...party,
        name: partyName,
        updatedAt: now,
      };
      await this.saveItem('parties', updated);
      await this.logAudit('Party Updated', 'Party Master', updated.id, existing?.name, updated.name);
      return updated;
    } else {
      const newParty: Party = {
        id: 'pty-' + Date.now(),
        name: partyName,
        contactPerson: party.contactPerson || '',
        mobile: party.mobile || '',
        alternateMobile: party.alternateMobile || '',
        address: party.address || '',
        city: party.city || '',
        state: party.state || '',
        gstNumber: party.gstNumber || '',
        email: party.email || '',
        openingBalance: Number(party.openingBalance) || 0,
        creditLimit: Number(party.creditLimit) || 0,
        remarks: party.remarks || '',
        active: party.active ?? true,
        createdAt: now,
        updatedAt: now,
      };
      await this.saveItem('parties', newParty);
      await this.logAudit('Party Created', 'Party Master', newParty.id, undefined, newParty.name);
      return newParty;
    }
  }

  public async deleteParty(id: string, soft = true): Promise<void> {
    const parties = await this.getParties(true);
    const target = parties.find((p) => p.id === id);
    if (!target) return;

    if (soft) {
      target.isDeleted = true;
      target.deletedAt = new Date().toISOString();
      target.deletedBy = this.currentUser.name;
      await this.saveItem('parties', target);
      await this.logAudit('Party Moved to Recycle Bin', 'Party Master', id, target.name);
    } else {
      await this.removeItem('parties', id);
      await this.logAudit('Party Permanently Deleted', 'Party Master', id, target.name);
    }
  }

  public async restoreParty(id: string): Promise<void> {
    const parties = await this.getParties(true);
    const target = parties.find((p) => p.id === id);
    if (!target) return;
    target.isDeleted = false;
    target.deletedAt = undefined;
    target.deletedBy = undefined;
    await this.saveItem('parties', target);
    await this.logAudit('Party Restored', 'Party Master', id, undefined, target.name);
  }

  // VEHICLES
  public async getVehicles(includeDeleted = false): Promise<Vehicle[]> {
    const all = await this.getAll<Vehicle>('vehicles');
    return includeDeleted ? all : all.filter((v) => !v.isDeleted);
  }

  public async saveVehicle(vehicle: Partial<Vehicle>): Promise<Vehicle> {
    if (!vehicle.vehicleNumber || !vehicle.vehicleNumber.trim()) {
      throw new Error('Vehicle number is required.');
    }
    const now = new Date().toISOString();
    const existingVehicles = await this.getVehicles(true);

    const formattedNumber = vehicle.vehicleNumber.trim().toUpperCase().replace(/\s+/g, '');
    const duplicate = existingVehicles.find(
      (v) => v.vehicleNumber.trim().toUpperCase().replace(/\s+/g, '') === formattedNumber && v.id !== vehicle.id && !v.isDeleted
    );
    if (duplicate) {
      throw new Error(`Vehicle number "${vehicle.vehicleNumber}" already registered.`);
    }

    if (vehicle.id) {
      const existing = existingVehicles.find((v) => v.id === vehicle.id);
      const updated: Vehicle = {
        ...existing!,
        ...vehicle,
        vehicleNumber: formattedNumber,
        updatedAt: now,
      };
      await this.saveItem('vehicles', updated);
      await this.logAudit('Vehicle Updated', 'Vehicle Master', updated.id, existing?.vehicleNumber, updated.vehicleNumber);
      return updated;
    } else {
      const newVehicle: Vehicle = {
        id: 'veh-' + Date.now(),
        vehicleNumber: formattedNumber,
        vehicleType: vehicle.vehicleType || 'Truck',
        ownerName: vehicle.ownerName || '',
        driverName: vehicle.driverName || '',
        driverMobile: vehicle.driverMobile || '',
        rcNumber: vehicle.rcNumber || '',
        insuranceExpiry: vehicle.insuranceExpiry || '',
        fitnessExpiry: vehicle.fitnessExpiry || '',
        permitExpiry: vehicle.permitExpiry || '',
        remarks: vehicle.remarks || '',
        createdAt: now,
        updatedAt: now,
      };
      await this.saveItem('vehicles', newVehicle);
      await this.logAudit('Vehicle Created', 'Vehicle Master', newVehicle.id, undefined, newVehicle.vehicleNumber);
      return newVehicle;
    }
  }

  public async deleteVehicle(id: string, soft = true): Promise<void> {
    const vehicles = await this.getVehicles(true);
    const target = vehicles.find((v) => v.id === id);
    if (!target) return;

    if (soft) {
      target.isDeleted = true;
      target.deletedAt = new Date().toISOString();
      target.deletedBy = this.currentUser.name;
      await this.saveItem('vehicles', target);
      await this.logAudit('Vehicle Soft-Deleted', 'Vehicle Master', id, target.vehicleNumber);
    } else {
      await this.removeItem('vehicles', id);
      await this.logAudit('Vehicle Permanently Deleted', 'Vehicle Master', id, target.vehicleNumber);
    }
  }

  public async restoreVehicle(id: string): Promise<void> {
    const vehicles = await this.getVehicles(true);
    const target = vehicles.find((v) => v.id === id);
    if (!target) return;
    target.isDeleted = false;
    target.deletedAt = undefined;
    target.deletedBy = undefined;
    await this.saveItem('vehicles', target);
    await this.logAudit('Vehicle Restored', 'Vehicle Master', id, undefined, target.vehicleNumber);
  }

  // DRIVERS
  public async getDrivers(includeDeleted = false): Promise<Driver[]> {
    const all = await this.getAll<Driver>('drivers');
    return includeDeleted ? all : all.filter((d) => !d.isDeleted);
  }

  public async saveDriver(driver: Partial<Driver>): Promise<Driver> {
    if (!driver.name || !driver.name.trim()) {
      throw new Error('Driver name is required.');
    }
    if (!driver.mobile || !driver.mobile.trim()) {
      throw new Error('Driver mobile is required.');
    }
    const now = new Date().toISOString();
    const existingDrivers = await this.getDrivers(true);

    if (driver.id) {
      const existing = existingDrivers.find((d) => d.id === driver.id);
      const updated: Driver = {
        ...existing!,
        ...driver,
        name: driver.name.trim(),
        mobile: driver.mobile.trim(),
        updatedAt: now,
      };
      await this.saveItem('drivers', updated);
      await this.logAudit('Driver Updated', 'Driver Master', updated.id, existing?.name, updated.name);
      return updated;
    } else {
      const newDriver: Driver = {
        id: 'drv-' + Date.now(),
        name: driver.name.trim(),
        mobile: driver.mobile.trim(),
        address: driver.address || '',
        licenseNumber: driver.licenseNumber || '',
        licenseExpiry: driver.licenseExpiry || '',
        assignedVehicle: driver.assignedVehicle || '',
        emergencyContact: driver.emergencyContact || '',
        remarks: driver.remarks || '',
        createdAt: now,
        updatedAt: now,
      };
      await this.saveItem('drivers', newDriver);
      await this.logAudit('Driver Created', 'Driver Master', newDriver.id, undefined, newDriver.name);
      return newDriver;
    }
  }

  public async deleteDriver(id: string, soft = true): Promise<void> {
    const drivers = await this.getDrivers(true);
    const target = drivers.find((d) => d.id === id);
    if (!target) return;

    if (soft) {
      target.isDeleted = true;
      target.deletedAt = new Date().toISOString();
      target.deletedBy = this.currentUser.name;
      await this.saveItem('drivers', target);
      await this.logAudit('Driver Soft-Deleted', 'Driver Master', id, target.name);
    } else {
      await this.removeItem('drivers', id);
      await this.logAudit('Driver Permanently Deleted', 'Driver Master', id, target.name);
    }
  }

  public async restoreDriver(id: string): Promise<void> {
    const drivers = await this.getDrivers(true);
    const target = drivers.find((d) => d.id === id);
    if (!target) return;
    target.isDeleted = false;
    target.deletedAt = undefined;
    target.deletedBy = undefined;
    await this.saveItem('drivers', target);
    await this.logAudit('Driver Restored', 'Driver Master', id, undefined, target.name);
  }

  // BILTIES
  public async getBilties(includeDeleted = false): Promise<Bilty[]> {
    const all = await this.getAll<Bilty>('bilties');
    return includeDeleted ? all : all.filter((b) => !b.isDeleted);
  }

  public async getNextBiltyNumber(): Promise<string> {
    const settings = await this.getSettings();
    const bilties = await this.getBilties(true);
    let maxNum = settings.biltyNextNumber || settings.biltyStartingNumber || 1001;
    bilties.forEach((b) => {
      const match = b.biltyNumber.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num >= maxNum) maxNum = num + 1;
      }
    });
    return `${settings.biltyPrefix}${maxNum}`;
  }

  public async isMonthLocked(dateString: string): Promise<boolean> {
    const monthKey = dateString.substring(0, 7); // YYYY-MM
    const closedMonths = await this.getAll<ClosedMonthRecord>('closedMonths');
    return closedMonths.some((m) => m.monthKey === monthKey);
  }

  public async saveBilty(bilty: Partial<Bilty>): Promise<Bilty> {
    const now = new Date().toISOString();
    const date = bilty.biltyDate || new Date().toISOString().substring(0, 10);

    // Verify month-end lock
    if (await this.isMonthLocked(date)) {
      throw new Error(`Cannot modify or create Bilty for ${date.substring(0, 7)} because this month is CLOSED.`);
    }

    const bilties = await this.getBilties(true);

    if (bilty.id) {
      const existing = bilties.find((b) => b.id === bilty.id);
      if (existing && existing.biltyDate && (await this.isMonthLocked(existing.biltyDate))) {
        throw new Error(`Record belongs to closed month ${existing.biltyDate.substring(0, 7)} and cannot be edited.`);
      }

      const total =
        (Number(bilty.freight) || 0) +
        (Number(bilty.loadingCharges) || 0) +
        (Number(bilty.unloadingCharges) || 0) +
        (Number(bilty.otherCharges) || 0);
      const paid = Number(bilty.paidAmount) || 0;
      const balance = Math.max(0, total - paid);

      const updated: Bilty = {
        ...existing!,
        ...bilty,
        totalAmount: total,
        paidAmount: paid,
        balanceAmount: balance,
        updatedAt: now,
      } as Bilty;

      await this.saveItem('bilties', updated);
      await this.logAudit('Bilty Updated', 'Bilty Entry', updated.id, existing?.biltyNumber, `Bilty #${updated.biltyNumber} updated`);
      return updated;
    } else {
      let bNum = bilty.biltyNumber;
      if (!bNum) {
        bNum = await this.getNextBiltyNumber();
      }

      // Check unique bilty number
      if (bilties.some((b) => b.biltyNumber.trim().toUpperCase() === bNum!.trim().toUpperCase() && !b.isDeleted)) {
        throw new Error(`Bilty number "${bNum}" already exists!`);
      }

      const total =
        (Number(bilty.freight) || 0) +
        (Number(bilty.loadingCharges) || 0) +
        (Number(bilty.unloadingCharges) || 0) +
        (Number(bilty.otherCharges) || 0);
      const paid = Number(bilty.paidAmount) || 0;
      const balance = Math.max(0, total - paid);

      const newBilty: Bilty = {
        id: 'blt-' + Date.now(),
        biltyNumber: bNum,
        biltyDate: date,
        consignor: bilty.consignor || '',
        consignee: bilty.consignee || '',
        fromCity: bilty.fromCity || '',
        toCity: bilty.toCity || '',
        transporter: bilty.transporter || 'National Road Carrier',
        vehicleNumber: (bilty.vehicleNumber || '').toUpperCase().replace(/\s+/g, ''),
        driverName: bilty.driverName || '',
        driverMobile: bilty.driverMobile || '',
        material: bilty.material || '',
        packages: Number(bilty.packages) || 1,
        packageType: bilty.packageType || 'Packages',
        weight: Number(bilty.weight) || 0,
        weightUnit: bilty.weightUnit || 'Kg',
        freight: Number(bilty.freight) || 0,
        loadingCharges: Number(bilty.loadingCharges) || 0,
        unloadingCharges: Number(bilty.unloadingCharges) || 0,
        otherCharges: Number(bilty.otherCharges) || 0,
        totalAmount: total,
        paymentType: bilty.paymentType || 'To-Pay',
        paidAmount: paid,
        balanceAmount: balance,
        remarks: bilty.remarks || '',
        createdAt: now,
        updatedAt: now,
      };

      await this.saveItem('bilties', newBilty);

      // Increment settings next number if matched
      const settings = await this.getSettings();
      const numMatch = bNum.match(/\d+$/);
      const currentNext = settings.biltyNextNumber || settings.biltyStartingNumber || 1001;
      if (numMatch && parseInt(numMatch[0], 10) >= currentNext) {
        settings.biltyNextNumber = parseInt(numMatch[0], 10) + 1;
        await this.saveItem('settings', { id: 'default', ...settings });
      }

      await this.logAudit('Bilty Created', 'Bilty Entry', newBilty.id, undefined, `Bilty #${newBilty.biltyNumber} created`);
      return newBilty;
    }
  }

  public async deleteBilty(id: string, soft = true): Promise<void> {
    const bilties = await this.getBilties(true);
    const target = bilties.find((b) => b.id === id);
    if (!target) return;

    if (await this.isMonthLocked(target.biltyDate)) {
      throw new Error(`Cannot delete Bilty #${target.biltyNumber} because month ${target.biltyDate.substring(0, 7)} is closed.`);
    }

    if (soft) {
      target.isDeleted = true;
      target.deletedAt = new Date().toISOString();
      target.deletedBy = this.currentUser.name;
      await this.saveItem('bilties', target);
      await this.logAudit('Bilty Soft-Deleted', 'Bilty Entry', id, target.biltyNumber);
    } else {
      await this.removeItem('bilties', id);
      await this.logAudit('Bilty Permanently Deleted', 'Bilty Entry', id, target.biltyNumber);
    }
  }

  public async restoreBilty(id: string): Promise<void> {
    const bilties = await this.getBilties(true);
    const target = bilties.find((b) => b.id === id);
    if (!target) return;
    target.isDeleted = false;
    target.deletedAt = undefined;
    target.deletedBy = undefined;
    await this.saveItem('bilties', target);
    await this.logAudit('Bilty Restored', 'Bilty Entry', id, undefined, target.biltyNumber);
  }

  // MEMOS
  public async getMemos(includeDeleted = false): Promise<Memo[]> {
    const all = await this.getAll<Memo>('memos');
    return includeDeleted ? all : all.filter((m) => !m.isDeleted);
  }

  public async getNextMemoNumber(): Promise<string> {
    const settings = await this.getSettings();
    const memos = await this.getMemos(true);
    let maxNum = settings.memoNextNumber || settings.memoStartingNumber || 501;
    memos.forEach((m) => {
      const match = m.memoNumber.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num >= maxNum) maxNum = num + 1;
      }
    });
    return `${settings.memoPrefix}${maxNum}`;
  }

  public async saveMemo(memo: Partial<Memo>): Promise<Memo> {
    const now = new Date().toISOString();
    const date = memo.memoDate || now.substring(0, 10);

    if (await this.isMonthLocked(date)) {
      throw new Error(`Cannot create/edit memo for ${date.substring(0, 7)} because this month is closed.`);
    }

    const memos = await this.getMemos(true);

    if (memo.id) {
      const existing = memos.find((m) => m.id === memo.id);
      const updated: Memo = {
        ...existing!,
        ...memo,
        updatedAt: now,
      } as Memo;
      await this.saveItem('memos', updated);
      await this.logAudit('Memo Updated', 'Memo', updated.id, existing?.memoNumber, updated.memoNumber);
      return updated;
    } else {
      let mNum = memo.memoNumber;
      if (!mNum) {
        mNum = await this.getNextMemoNumber();
      }

      const newMemo: Memo = {
        id: 'mem-' + Date.now(),
        memoNumber: mNum,
        memoDate: date,
        party: memo.party || memo.sender || '',
        sender: memo.sender || memo.party || '',
        senderMobile: memo.senderMobile || '',
        receiver: memo.receiver || '',
        receiverMobile: memo.receiverMobile || '',
        vehicleNumber: (memo.vehicleNumber || '').toUpperCase().replace(/\s+/g, ''),
        driver: memo.driver || '',
        driverMobile: memo.driverMobile || '',
        fromCity: memo.fromCity || '',
        toCity: memo.toCity || '',
        biltyReferences: memo.biltyReferences || [],
        material: memo.material || '',
        packages: Number(memo.packages) || (memo.items?.reduce((acc, i) => acc + (Number(i.packages) || 0), 0) || 0),
        weight: Number(memo.weight) || (memo.items?.reduce((acc, i) => acc + (Number(i.weight) || 0), 0) || 0),
        items: memo.items || [],
        amount: Number(memo.amount) || 0,
        advanceAmount: Number(memo.advanceAmount) || 0,
        dieselAmount: Number(memo.dieselAmount) || 0,
        balanceAmount: Number(memo.balanceAmount) || 0,
        remarks: memo.remarks || '',
        createdAt: now,
        updatedAt: now,
      };

      await this.saveItem('memos', newMemo);

      const settings = await this.getSettings();
      const numMatch = mNum.match(/\d+$/);
      const currentNext = settings.memoNextNumber || settings.memoStartingNumber || 501;
      if (numMatch && parseInt(numMatch[0], 10) >= currentNext) {
        settings.memoNextNumber = parseInt(numMatch[0], 10) + 1;
        await this.saveItem('settings', { id: 'default', ...settings });
      }

      await this.logAudit('Memo Created', 'Memo', newMemo.id, undefined, newMemo.memoNumber);
      return newMemo;
    }
  }

  public async deleteMemo(id: string, soft = true): Promise<void> {
    const memos = await this.getMemos(true);
    const target = memos.find((m) => m.id === id);
    if (!target) return;

    if (soft) {
      target.isDeleted = true;
      target.deletedAt = new Date().toISOString();
      target.deletedBy = this.currentUser.name;
      await this.saveItem('memos', target);
      await this.logAudit('Memo Soft-Deleted', 'Memo', id, target.memoNumber);
    } else {
      await this.removeItem('memos', id);
      await this.logAudit('Memo Permanently Deleted', 'Memo', id, target.memoNumber);
    }
  }

  public async restoreMemo(id: string): Promise<void> {
    const memos = await this.getMemos(true);
    const target = memos.find((m) => m.id === id);
    if (!target) return;
    target.isDeleted = false;
    target.deletedAt = undefined;
    target.deletedBy = undefined;
    await this.saveItem('memos', target);
    await this.logAudit('Memo Restored', 'Memo', id, undefined, target.memoNumber);
  }

  // MEDICAL ENTRIES
  public async getMedicalEntries(includeDeleted = false): Promise<MedicalEntry[]> {
    const all = await this.getAll<MedicalEntry>('medicalEntries');
    return includeDeleted ? all : all.filter((m) => !m.isDeleted);
  }

  public async getNextMedicalNumber(): Promise<string> {
    const settings = await this.getSettings();
    const entries = await this.getMedicalEntries(true);
    let maxNum = settings.medicalNextNumber || settings.medicalStartingNumber || 101;
    entries.forEach((m) => {
      const match = m.entryNumber.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num >= maxNum) maxNum = num + 1;
      }
    });
    return `${settings.medicalPrefix}${maxNum}`;
  }

  public async saveMedicalEntry(entry: Partial<MedicalEntry>): Promise<MedicalEntry> {
    const now = new Date().toISOString();
    const entries = await this.getMedicalEntries(true);

    if (entry.id) {
      const existing = entries.find((m) => m.id === entry.id);
      const updatedDate = entry.date || (entry as any).entryDate || existing?.date || now.substring(0, 10);
      const updated: MedicalEntry = {
        ...existing!,
        ...entry,
        date: updatedDate,
        updatedAt: now,
      } as MedicalEntry;
      await this.saveItem('medicalEntries', updated);
      await this.logAudit('Medical Entry Updated', 'Medical Entries', updated.id, existing?.entryNumber, updated.entryNumber);
      return updated;
    } else {
      let eNum = entry.entryNumber;
      if (!eNum) {
        eNum = await this.getNextMedicalNumber();
      }

      const newEntry: MedicalEntry = {
        id: 'med-' + Date.now(),
        entryNumber: eNum,
        date: entry.date || (entry as any).entryDate || now.substring(0, 10),
        party: entry.party || '',
        patientReference: entry.patientReference || '',
        medicalItem: entry.medicalItem || '',
        quantity: Number(entry.quantity) || 1,
        batchNumber: entry.batchNumber || '',
        amount: Number(entry.amount) || 0,
        transportBiltyNumber: entry.transportBiltyNumber || '',
        remarks: entry.remarks || '',
        createdAt: now,
        updatedAt: now,
      };

      await this.saveItem('medicalEntries', newEntry);

      const settings = await this.getSettings();
      const numMatch = eNum.match(/\d+$/);
      const currentNext = settings.medicalNextNumber || settings.medicalStartingNumber || 101;
      if (numMatch && parseInt(numMatch[0], 10) >= currentNext) {
        settings.medicalNextNumber = parseInt(numMatch[0], 10) + 1;
        await this.saveItem('settings', { id: 'default', ...settings });
      }

      await this.logAudit('Medical Entry Created', 'Medical Entries', newEntry.id, undefined, newEntry.entryNumber);
      return newEntry;
    }
  }

  public async deleteMedicalEntry(id: string, soft = true): Promise<void> {
    const entries = await this.getMedicalEntries(true);
    const target = entries.find((m) => m.id === id);
    if (!target) return;

    if (soft) {
      target.isDeleted = true;
      target.deletedAt = new Date().toISOString();
      target.deletedBy = this.currentUser.name;
      await this.saveItem('medicalEntries', target);
      await this.logAudit('Medical Entry Soft-Deleted', 'Medical Entries', id, target.entryNumber);
    } else {
      await this.removeItem('medicalEntries', id);
      await this.logAudit('Medical Entry Permanently Deleted', 'Medical Entries', id, target.entryNumber);
    }
  }

  public async restoreMedicalEntry(id: string): Promise<void> {
    const entries = await this.getMedicalEntries(true);
    const target = entries.find((m) => m.id === id);
    if (!target) return;
    target.isDeleted = false;
    target.deletedAt = undefined;
    target.deletedBy = undefined;
    await this.saveItem('medicalEntries', target);
    await this.logAudit('Medical Entry Restored', 'Medical Entries', id, undefined, target.entryNumber);
  }

  // ENTRIES MATCH-UP
  public async getMatchEntries(): Promise<MatchEntry[]> {
    return this.getAll<MatchEntry>('matchEntries');
  }

  public async saveMatchEntry(entry: MatchEntry): Promise<void> {
    await this.saveItem('matchEntries', entry);
    await this.logAudit('Match-Up Record Updated', 'Entries Match-Up', entry.id, undefined, `${entry.biltyNumber} (${entry.status})`);
  }

  public async updateMatchEntry(entry: MatchEntry): Promise<void> {
    await this.saveMatchEntry(entry);
  }

  public async bulkSaveMatchEntries(entries: MatchEntry[]): Promise<void> {
    for (const entry of entries) {
      await this.saveItem('matchEntries', entry);
    }
  }

  public async setMatchResolution(id: string, isVerified: boolean, note?: string): Promise<void> {
    const list = await this.getMatchEntries();
    const target = list.find((m) => m.id === id);
    if (!target) return;
    target.isVerified = isVerified;
    if (note !== undefined) target.resolutionNote = note;
    target.resolvedBy = this.currentUser.name;
    target.resolvedAt = new Date().toISOString();
    await this.saveItem('matchEntries', target);
    await this.logAudit('Match-Up Resolution', 'Entries Match-Up', id, undefined, `Verified=${isVerified}: ${note || ''}`);
  }

  // MEDICAL MATCH-UP
  public async getMedicalMatchEntries(): Promise<MedicalMatchEntry[]> {
    return this.getAll<MedicalMatchEntry>('medicalMatchEntries');
  }

  public async saveMedicalMatchEntry(entry: MedicalMatchEntry): Promise<void> {
    await this.saveItem('medicalMatchEntries', entry);
    await this.logAudit('Medical Match Record Updated', 'Medical Match-Up', entry.id, undefined, `${entry.entryNumber} (${entry.status})`);
  }

  public async updateMedicalMatchEntry(entry: MedicalMatchEntry): Promise<void> {
    await this.saveMedicalMatchEntry(entry);
  }

  public async bulkSaveMedicalMatchEntries(entries: MedicalMatchEntry[]): Promise<void> {
    for (const entry of entries) {
      await this.saveItem('medicalMatchEntries', entry);
    }
  }

  public async setMedicalMatchResolution(id: string, isVerified: boolean, note?: string): Promise<void> {
    const list = await this.getMedicalMatchEntries();
    const target = list.find((m) => m.id === id);
    if (!target) return;
    target.isVerified = isVerified;
    if (note !== undefined) target.correctionNote = note;
    target.resolvedBy = this.currentUser.name;
    target.resolvedAt = new Date().toISOString();
    await this.saveItem('medicalMatchEntries', target);
    await this.logAudit('Medical Match Resolution', 'Medical Match-Up', id, undefined, `Verified=${isVerified}: ${note || ''}`);
  }

  // MONTH END CLOSING
  public async getClosedMonths(): Promise<ClosedMonthRecord[]> {
    return this.getAll<ClosedMonthRecord>('closedMonths');
  }

  public async closeMonth(monthKey: string, remarks?: string): Promise<void> {
    const closed = await this.getClosedMonths();
    if (closed.some((m) => m.monthKey === monthKey)) {
      throw new Error(`Month ${monthKey} is already closed.`);
    }

    const record: ClosedMonthRecord & { id: string } = {
      id: monthKey,
      monthKey,
      closedAt: new Date().toISOString(),
      closedBy: this.currentUser.name,
      remarks,
    };

    await this.saveItem('closedMonths', record);
    await this.logAudit('Month Closed', 'Month End Parties', monthKey, undefined, `Month ${monthKey} closed by ${this.currentUser.name}`);
  }

  public async reopenMonth(monthKey: string): Promise<void> {
    if (this.currentUser.role !== 'admin') {
      throw new Error('Only Administrator has permission to reopen a closed month.');
    }
    await this.removeItem('closedMonths', monthKey);
    await this.logAudit('Month Reopened', 'Month End Parties', monthKey, undefined, `Month ${monthKey} reopened by ${this.currentUser.name}`);
  }

  // BACKUP & RESTORE
  public async createBackup(): Promise<DatabaseDump> {
    const [settings, parties, vehicles, drivers, bilties, memos, medicalEntries, matchEntries, medicalMatchEntries, closedMonths, auditLogs] =
      await Promise.all([
        this.getSettings(),
        this.getParties(true),
        this.getVehicles(true),
        this.getDrivers(true),
        this.getBilties(true),
        this.getMemos(true),
        this.getMedicalEntries(true),
        this.getMatchEntries(),
        this.getMedicalMatchEntries(),
        this.getClosedMonths(),
        this.getAuditLogs(),
      ]);

    const dump: DatabaseDump = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      exportedBy: this.currentUser.name,
      settings,
      parties,
      vehicles,
      drivers,
      bilties,
      memos,
      medicalEntries,
      matchEntries,
      medicalMatchEntries,
      closedMonths,
      auditLogs,
    };

    await this.logAudit('Database Backup Created', 'Backup & Restore', 'BACKUP', undefined, `Exported ${bilties.length} bilties, ${parties.length} parties`);
    return dump;
  }

  public async restoreBackup(dump: DatabaseDump): Promise<void> {
    if (this.currentUser.role !== 'admin') {
      throw new Error('Only Administrator can restore database backups.');
    }

    if (!dump.version || !dump.bilties || !dump.parties) {
      throw new Error('Invalid Transport Entry backup file format.');
    }

    // Restore settings
    if (dump.settings) {
      await this.saveItem('settings', { id: 'default', ...dump.settings });
    }

    // Clear and refill stores
    const clearStore = async (storeName: string) => {
      const items = await this.getAll<{ id: string }>(storeName);
      for (const item of items) {
        await this.removeItem(storeName, item.id);
      }
    };

    await clearStore('parties');
    for (const p of dump.parties || []) await this.saveItem('parties', p);

    await clearStore('vehicles');
    for (const v of dump.vehicles || []) await this.saveItem('vehicles', v);

    await clearStore('drivers');
    for (const d of dump.drivers || []) await this.saveItem('drivers', d);

    await clearStore('bilties');
    for (const b of dump.bilties || []) await this.saveItem('bilties', b);

    await clearStore('memos');
    for (const m of dump.memos || []) await this.saveItem('memos', m);

    await clearStore('medicalEntries');
    for (const me of dump.medicalEntries || []) await this.saveItem('medicalEntries', me);

    await clearStore('matchEntries');
    for (const mt of dump.matchEntries || []) await this.saveItem('matchEntries', mt);

    await clearStore('medicalMatchEntries');
    for (const mmt of dump.medicalMatchEntries || []) await this.saveItem('medicalMatchEntries', mmt);

    await clearStore('closedMonths');
    for (const cm of dump.closedMonths || []) await this.saveItem('closedMonths', { id: cm.monthKey, ...cm });

    await this.logAudit(
      'Database Restored from Backup',
      'Backup & Restore',
      'RESTORE',
      undefined,
      `Restored ${dump.bilties?.length || 0} bilties, ${dump.parties?.length || 0} parties from backup dated ${dump.exportedAt}`
    );
  }

  public async clearDemoData(): Promise<void> {
    if (this.currentUser.role !== 'admin') {
      throw new Error('Only Administrator can clear data.');
    }

    const clearStore = async (storeName: string) => {
      const items = await this.getAll<{ id: string }>(storeName);
      for (const item of items) {
        await this.removeItem(storeName, item.id);
      }
    };

    await clearStore('parties');
    await clearStore('vehicles');
    await clearStore('drivers');
    await clearStore('bilties');
    await clearStore('memos');
    await clearStore('medicalEntries');
    await clearStore('matchEntries');
    await clearStore('medicalMatchEntries');
    await clearStore('closedMonths');

    await this.logAudit('All Demo Data Cleared', 'System', 'CLEAR', undefined, 'Clean database ready for fresh production entry');
  }

  public async loadDemoData(): Promise<void> {
    if (this.currentUser.role !== 'admin') {
      throw new Error('Only Administrator can reload demo data.');
    }
    await this.clearDemoData();
    await this.ensureInitialData();
    await this.logAudit('Demo Data Reloaded', 'System', 'RELOAD', undefined, 'Loaded complete transport sample datasets');
  }

  // ALIASES & COMPATIBILITY HELPERS
  public async getCompanySettings(): Promise<CompanySettings> {
    return this.getSettings();
  }

  public async saveCompanySettings(settings: CompanySettings): Promise<void> {
    return this.updateSettings(settings);
  }

  public async exportCompleteBackup(): Promise<string> {
    const dump = await this.createBackup();
    return JSON.stringify(dump, null, 2);
  }

  public async restoreCompleteBackup(jsonString: string): Promise<boolean> {
    try {
      const dump = JSON.parse(jsonString) as DatabaseDump;
      await this.restoreBackup(dump);
      return true;
    } catch (err) {
      console.error('Failed to restore backup:', err);
      return false;
    }
  }

  public async resetToSeedData(): Promise<void> {
    return this.loadDemoData();
  }

  // AUTO-SCHEDULING DATABASE BACKUP METHODS
  public async getAutoBackupConfig(): Promise<AutoBackupConfig> {
    const settings = await this.getSettings();
    return settings.autoBackupConfig || defaultCompanySettings.autoBackupConfig!;
  }

  public async updateAutoBackupConfig(configUpdate: Partial<AutoBackupConfig>): Promise<AutoBackupConfig> {
    const current = await this.getSettings();
    const newConfig: AutoBackupConfig = {
      ...(current.autoBackupConfig || defaultCompanySettings.autoBackupConfig!),
      ...configUpdate,
    };
    await this.updateSettings({
      ...current,
      autoBackupConfig: newConfig,
    });
    return newConfig;
  }

  // CUSTOM STORAGE PATH & PC DIRECTORY BACKUP METHODS
  public async getStorageConfig(): Promise<StorageConfig> {
    const settings = await this.getSettings();
    return settings.storageConfig || defaultCompanySettings.storageConfig!;
  }

  public async updateStorageConfig(configUpdate: Partial<StorageConfig>): Promise<StorageConfig> {
    const current = await this.getSettings();
    const newConfig: StorageConfig = {
      ...(current.storageConfig || defaultCompanySettings.storageConfig!),
      ...configUpdate,
    };
    await this.updateSettings({
      ...current,
      storageConfig: newConfig,
    });
    return newConfig;
  }

  public async syncToCustomDirectory(): Promise<{ success: boolean; message: string; folderName?: string; bytesWritten?: number }> {
    const backupJson = await this.exportCompleteBackup();
    const config = await this.getStorageConfig();
    const res = await FileStorageService.syncDatabaseToDirectory(backupJson, config.backupSubFolder || 'Daily_Backups');
    await this.updateStorageConfig({
      lastSyncedAt: new Date().toISOString(),
      lastSyncStatus: 'success',
      lastSyncMessage: res.message,
      folderName: res.folderName,
      hasDirectoryPermission: true,
    });
    await this.logAudit('PC Directory Sync', 'Storage', 'SYNC', undefined, `Synced database to folder: ${res.folderName}`);
    return res;
  }

  public async getAutoBackupSnapshots(): Promise<AutoBackupSnapshot[]> {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + 'auto_snapshots');
      if (!raw) return [];
      const list: AutoBackupSnapshot[] = JSON.parse(raw);
      return Array.isArray(list)
        ? list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        : [];
    } catch (e) {
      console.error('Failed to get auto-backup snapshots', e);
      return [];
    }
  }

  public async saveAutoBackupSnapshot(snapshot: AutoBackupSnapshot): Promise<void> {
    try {
      const settings = await this.getSettings();
      const maxRetention = Math.min(settings.autoBackupConfig?.maxRetentionCount || 10, 20);
      const current = await this.getAutoBackupSnapshots();
      let updated = [snapshot, ...current.filter((s) => s.id !== snapshot.id)].slice(0, maxRetention);

      let saved = false;
      while (!saved && updated.length > 0) {
        try {
          localStorage.setItem(STORAGE_PREFIX + 'auto_snapshots', JSON.stringify(updated));
          saved = true;
        } catch (quotaErr) {
          // If browser storage is constrained, prune oldest snapshots or trim payloads
          if (updated.length > 1) {
            updated.pop();
          } else {
            // As fallback, keep metadata
            const fallback = [{ ...snapshot, dataJson: '' }];
            localStorage.setItem(STORAGE_PREFIX + 'auto_snapshots', JSON.stringify(fallback));
            saved = true;
          }
        }
      }
    } catch (e) {
      console.error('Failed to save auto-backup snapshot', e);
    }
  }

  public async deleteAutoBackupSnapshot(id: string): Promise<void> {
    try {
      const current = await this.getAutoBackupSnapshots();
      const updated = current.filter((s) => s.id !== id);
      localStorage.setItem(STORAGE_PREFIX + 'auto_snapshots', JSON.stringify(updated));
      await this.logAudit('Auto-Backup Snapshot Deleted', 'Backup & Restore', id, undefined, 'Snapshot purged');
    } catch (e) {
      console.error('Failed to delete auto-backup snapshot', e);
    }
  }

  public async executeScheduledBackup(
    triggerType: 'scheduled' | 'manual' = 'scheduled',
    note?: string
  ): Promise<{ snapshot: AutoBackupSnapshot; dumpJson: string }> {
    const dump = await this.createBackup();
    const dumpJson = JSON.stringify(dump, null, 2);
    const sizeBytes = new Blob([dumpJson]).size;
    const sizeKb = Math.round(sizeBytes / 1024);

    const biltyCount = dump.bilties?.length || 0;
    const memoCount = dump.memos?.length || 0;
    const partyCount = dump.parties?.length || 0;
    const summary = `${biltyCount} Bilties, ${memoCount} Memos, ${partyCount} Parties`;

    const settings = await this.getSettings();
    const interval = settings.autoBackupConfig?.interval || 'daily';

    const snapshot: AutoBackupSnapshot = {
      id: `snap-${Date.now()}`,
      timestamp: new Date().toISOString(),
      interval,
      triggerType,
      biltyCount,
      memoCount,
      partyCount,
      fileSizeKb: sizeKb,
      dataJson: dumpJson,
      note: note || (triggerType === 'scheduled' ? `Auto-scheduled ${interval} backup` : 'Manual test backup'),
    };

    // Save snapshot to local snapshot store
    await this.saveAutoBackupSnapshot(snapshot);

    // Update settings with last backup execution info
    const updatedConfig: AutoBackupConfig = {
      ...(settings.autoBackupConfig || defaultCompanySettings.autoBackupConfig!),
      lastBackupAt: snapshot.timestamp,
      lastBackupStatus: 'success',
      lastBackupSize: sizeBytes,
      lastBackupSummary: summary,
    };

    await this.updateSettings({
      ...settings,
      autoBackupConfig: updatedConfig,
    });

    await this.logAudit(
      triggerType === 'scheduled' ? 'Scheduled Auto-Backup Completed' : 'Manual Auto-Backup Triggered',
      'Backup & Restore',
      snapshot.id,
      undefined,
      `${interval.toUpperCase()} backup: ${summary} (${sizeKb} KB)`
    );

    return { snapshot, dumpJson };
  }

  public async isMonthClosed(monthKeyOrDate: string): Promise<boolean> {
    return this.isMonthLocked(monthKeyOrDate);
  }

  public async getRecycleBinItems() {
    const [bilties, memos, medicals, parties, vehicles, drivers] = await Promise.all([
      this.getBilties(true),
      this.getMemos(true),
      this.getMedicalEntries(true),
      this.getParties(true),
      this.getVehicles(true),
      this.getDrivers(true),
    ]);

    const items: Array<{
      id: string;
      type: 'bilty' | 'memo' | 'medical' | 'party' | 'vehicle' | 'driver';
      identifier: string;
      deletedAt: string;
      deletedBy: string;
    }> = [];

    bilties
      .filter((b) => b.isDeleted)
      .forEach((b) => {
        items.push({
          id: b.id,
          type: 'bilty',
          identifier: b.biltyNumber,
          deletedAt: b.deletedAt || b.updatedAt,
          deletedBy: b.deletedBy || 'Admin',
        });
      });

    memos
      .filter((m) => m.isDeleted)
      .forEach((m) => {
        items.push({
          id: m.id,
          type: 'memo',
          identifier: m.memoNumber,
          deletedAt: m.deletedAt || m.updatedAt,
          deletedBy: m.deletedBy || 'Admin',
        });
      });

    medicals
      .filter((med) => med.isDeleted)
      .forEach((med) => {
        items.push({
          id: med.id,
          type: 'medical',
          identifier: med.entryNumber,
          deletedAt: med.deletedAt || med.updatedAt,
          deletedBy: med.deletedBy || 'Admin',
        });
      });

    parties
      .filter((p) => p.isDeleted)
      .forEach((p) => {
        items.push({
          id: p.id,
          type: 'party',
          identifier: p.name,
          deletedAt: p.deletedAt || p.updatedAt,
          deletedBy: p.deletedBy || 'Admin',
        });
      });

    vehicles
      .filter((v) => v.isDeleted)
      .forEach((v) => {
        items.push({
          id: v.id,
          type: 'vehicle',
          identifier: v.vehicleNumber,
          deletedAt: v.deletedAt || v.updatedAt,
          deletedBy: v.deletedBy || 'Admin',
        });
      });

    drivers
      .filter((d) => d.isDeleted)
      .forEach((d) => {
        items.push({
          id: d.id,
          type: 'driver',
          identifier: d.name,
          deletedAt: d.deletedAt || d.updatedAt,
          deletedBy: d.deletedBy || 'Admin',
        });
      });

    return items.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  }

  public async restoreFromRecycleBin(id: string, type: 'bilty' | 'memo' | 'medical' | 'party' | 'vehicle' | 'driver'): Promise<void> {
    if (type === 'bilty') await this.restoreBilty(id);
    else if (type === 'memo') await this.restoreMemo(id);
    else if (type === 'medical') await this.restoreMedicalEntry(id);
    else if (type === 'party') await this.restoreParty(id);
    else if (type === 'vehicle') await this.restoreVehicle(id);
    else if (type === 'driver') await this.restoreDriver(id);
  }

  public async permanentDelete(id: string, type: 'bilty' | 'memo' | 'medical' | 'party' | 'vehicle' | 'driver'): Promise<void> {
    if (type === 'bilty') await this.deleteBilty(id, false);
    else if (type === 'memo') await this.deleteMemo(id, false);
    else if (type === 'medical') await this.deleteMedicalEntry(id, false);
    else if (type === 'party') await this.deleteParty(id, false);
    else if (type === 'vehicle') await this.deleteVehicle(id, false);
    else if (type === 'driver') await this.deleteDriver(id, false);
  }

  public async generateMonthEndSummary(monthKey: string, targetPartyName?: string) {
    const [bilties, parties, closedMonths] = await Promise.all([
      this.getBilties(false),
      this.getParties(false),
      this.getClosedMonths(),
    ]);

    const isClosed = closedMonths.some((cm) => cm.monthKey === monthKey);
    const closedRecord = closedMonths.find((cm) => cm.monthKey === monthKey);

    // Filter bilties for this month key (YYYY-MM)
    const monthBilties = bilties.filter((b) => b.biltyDate && b.biltyDate.startsWith(monthKey));

    const partyNames = targetPartyName
      ? [targetPartyName]
      : Array.from(new Set(monthBilties.map((b) => b.consignor).concat(parties.map((p) => p.name)))).filter(Boolean);

    return partyNames.map((pName) => {
      const party = parties.find((p) => p.name === pName);
      const partyBilties = monthBilties.filter((b) => b.consignor === pName || b.consignee === pName);

      const totalEntries = partyBilties.length;
      const totalBiltyAmount = partyBilties.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
      const totalFreight = partyBilties.reduce((sum, b) => sum + (b.freight || 0), 0);
      const totalCharges = partyBilties.reduce(
        (sum, b) => sum + (b.loadingCharges || 0) + (b.unloadingCharges || 0) + (b.otherCharges || 0),
        0
      );
      const totalPaid = partyBilties.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
      const totalPending = partyBilties.reduce((sum, b) => sum + (b.balanceAmount || 0), 0);
      const openingBalance = party?.openingBalance || 0;
      const closingBalance = openingBalance + totalPending;

      const transactions = partyBilties.map((b) => ({
        date: b.biltyDate,
        biltyNumber: b.biltyNumber,
        vehicleNumber: b.vehicleNumber,
        fromCity: b.fromCity,
        toCity: b.toCity,
        material: b.material,
        packages: b.packages,
        weight: b.weight,
        freight: b.freight,
        otherCharges: (b.loadingCharges || 0) + (b.unloadingCharges || 0) + (b.otherCharges || 0),
        totalAmount: b.totalAmount,
        paidAmount: b.paidAmount,
        balanceAmount: b.balanceAmount,
      }));

      return {
        monthKey,
        month: monthKey,
        partyName: pName,
        openingBalance,
        totalEntries,
        totalBiltyAmount,
        totalFreight,
        totalCharges,
        totalOtherCharges: totalCharges,
        totalPaid,
        totalPaidAmount: totalPaid,
        totalPending,
        totalPendingAmount: totalPending,
        closingBalance,
        isClosed,
        closedAt: closedRecord?.closedAt,
        closedBy: closedRecord?.closedBy,
        transactions,
      };
    });
  }
}

export const db = new TransportDatabase();
