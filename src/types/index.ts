export type Role = 'admin' | 'operator' | 'viewer';
export type UserRole = Role;

export type ViewType =
  | 'dashboard'
  | 'bilty'
  | 'memo'
  | 'matchup'
  | 'medical'
  | 'medical-matchup'
  | 'medicalMatchup'
  | 'month-end'
  | 'monthEnd'
  | 'reports'
  | 'parties'
  | 'vehicles'
  | 'drivers'
  | 'settings'
  | 'recycle-bin'
  | 'backup'
  | 'audit';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

export interface RecycleBinItem {
  id: string;
  type: 'bilty' | 'memo' | 'medical' | 'party' | 'vehicle' | 'driver';
  identifier: string;
  deletedAt: string;
  deletedBy: string;
}

export interface UserSession {
  id: string;
  name: string;
  role: Role;
}

export interface RolePermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canRestore: boolean;
  canCloseMonth: boolean;
  canReopenMonth: boolean;
  canImportData: boolean;
  canRestoreBackup: boolean;
  canChangeSettings: boolean;
}

export interface Party {
  id: string;
  name: string;
  contactPerson: string;
  mobile: string;
  alternateMobile?: string;
  address: string;
  city: string;
  state: string;
  gstNumber?: string;
  email?: string;
  openingBalance: number;
  creditLimit?: number;
  remarks?: string;
  active: boolean;
  isActive?: boolean; // alias
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  ownerName: string;
  driverName: string;
  driverMobile: string;
  rcNumber?: string;
  insuranceExpiry?: string;
  fitnessExpiry?: string;
  permitExpiry?: string;
  status?: 'Active' | 'Maintenance' | 'Inactive';
  remarks?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: string;
  name: string;
  mobile: string;
  alternateMobile?: string;
  address: string;
  licenseNumber: string;
  licenseExpiry?: string;
  assignedVehicle?: string;
  emergencyContact?: string;
  status?: 'Active' | 'Inactive';
  remarks?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentType = 'Paid' | 'To-Pay' | 'T.B.B.'; // To Be Billed

export interface Bilty {
  id: string;
  biltyNumber: string;
  biltyDate: string;
  consignor: string;
  consignee: string;
  fromCity: string;
  toCity: string;
  transporter: string;
  vehicleNumber: string;
  driverName: string;
  driverMobile: string;
  material: string;
  packages: number;
  packageType: string;
  weight: number;
  weightUnit: string;
  freight: number;
  loadingCharges: number;
  unloadingCharges: number;
  otherCharges: number;
  serviceTaxGst?: number;
  totalAmount: number;
  paymentType: PaymentType;
  paidAmount: number;
  balanceAmount: number;
  remarks?: string;
  isMonthClosed?: boolean;
  closedMonthKey?: string; // e.g. "2026-09"
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type MatchStatus = 'Matched' | 'Partially Matched' | 'Missing' | 'Duplicate';

export interface MatchEntry {
  id: string;
  biltyNumber: string;
  biltyDate?: string;
  date: string;
  partyA: string;
  partyB: string;
  vehicleA: string;
  vehicleB: string;
  amountA: number;
  amountB: number;
  weightA: number;
  weightB: number;
  status: MatchStatus;
  diffNotes: string[];
  discrepancies?: string[];
  isVerified: boolean;
  resolutionNote?: string;
  resolutionNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  sourceSet: 'A' | 'B' | 'Both';
  bookingRecord?: {
    consignor?: string;
    consignee?: string;
    vehicleNumber?: string;
    weight?: number;
    amount?: number;
  };
  transporterRecord?: {
    transporterName?: string;
    vehicleNumber?: string;
    weight?: number;
    amount?: number;
  };
}

export interface MemoItem {
  id: string;
  productName: string;
  packages: number;
  packageType?: string; // Cartons, Bags, Boxes, Bundles, Drums, etc.
  weight?: number; // Kg
  rate?: number; // Freight or unit rate
  amount: number;
  remarks?: string;
}

export interface Memo {
  id: string;
  memoNumber: string;
  memoDate: string;
  party: string;
  sender?: string; // Consignor / Bhejne Wala
  senderMobile?: string;
  receiver?: string; // Consignee / Paane Wala
  receiverMobile?: string;
  vehicleNumber: string;
  driver: string;
  driverMobile?: string;
  fromCity: string;
  toCity: string;
  biltyReferences: string[]; // List of bilty numbers
  material?: string;
  packages?: number;
  weight?: number;
  items?: MemoItem[]; // Product entry product-name wise
  amount: number;
  advanceAmount?: number;
  dieselAmount?: number;
  balanceAmount?: number;
  remarks?: string;
  isMonthClosed?: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedicalEntry {
  id: string;
  entryNumber: string;
  date: string;
  entryDate?: string; // alias
  party: string;
  patientReference: string;
  medicalItem: string;
  quantity: number;
  batchNumber: string;
  amount: number;
  transportBiltyNumber: string;
  remarks?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedicalMatchEntry {
  id: string;
  entryNumber: string;
  date: string;
  entryDate?: string; // alias
  partyA?: string;
  partyB?: string;
  itemA?: string;
  itemB?: string;
  quantityA?: number;
  quantityB?: number;
  batchA?: string;
  batchB?: string;
  amountA?: number;
  amountB?: number;
  status: MatchStatus | 'Missing in Hospital' | 'Missing in Warehouse';
  discrepancies?: string[];
  diffNotes?: string[];
  isVerified: boolean;
  verifiedBy?: string;
  resolutionNotes?: string;
  correctionNote?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  sourceSet?: 'A' | 'B' | 'Both';
  warehouseRecord?: {
    item: string;
    batchNumber: string;
    quantity: number;
    amount: number;
  };
  hospitalRecord?: {
    party: string;
    item: string;
    batchNumber: string;
    quantity: number;
    amount: number;
  };
}

export interface MonthEndTransaction {
  date: string;
  biltyNumber: string;
  vehicleNumber: string;
  fromCity: string;
  toCity: string;
  material: string;
  packages: number;
  weight: number;
  freight: number;
  otherCharges: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
}

export interface MonthEndSummary {
  monthKey: string; // YYYY-MM
  month?: string; // alias
  partyName: string;
  openingBalance: number;
  totalEntries: number;
  totalBiltyAmount: number;
  totalFreight: number;
  totalCharges: number;
  totalOtherCharges?: number;
  totalPaid: number;
  totalPaidAmount?: number;
  totalPending: number;
  totalPendingAmount?: number;
  closingBalance: number;
  isClosed: boolean;
  closedAt?: string;
  closedBy?: string;
  transactions?: MonthEndTransaction[];
}

export interface ClosedMonthRecord {
  monthKey: string; // e.g. "2026-09"
  closedAt: string;
  closedBy: string;
  remarks?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  userName?: string;
  action: string;
  module: string;
  entityType?: string;
  recordId: string;
  entityId?: string;
  oldValue?: string;
  newValue?: string;
  details?: string;
}

export interface OperatingCity {
  id: string;
  name: string;
  state?: string;
  code?: string;
  isHub?: boolean;
  showOnHomeShortcut?: boolean;
  notes?: string;
}

export interface QuickRoute {
  id: string;
  fromCity: string;
  toCity: string;
  distanceKm?: number;
  approxTransitTime?: string;
  defaultFreightRate?: number;
  routeCode?: string;
  remarks?: string;
  active?: boolean;
}

export type BackupInterval = 'daily' | 'weekly';
export type DayOfWeek = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export interface AutoBackupConfig {
  enabled: boolean;
  interval: BackupInterval;
  time: string; // HH:MM format e.g. "20:00"
  dayOfWeek?: DayOfWeek; // For weekly interval e.g. 'sunday'
  autoDownload: boolean; // Also download JSON file automatically
  maxRetentionCount: number; // Number of local snapshots to retain (default 10)
  lastBackupAt?: string; // ISO date string of last run
  lastBackupStatus?: 'success' | 'failed';
  lastBackupSize?: number; // Size in bytes
  lastBackupSummary?: string; // e.g. "45 Bilties, 12 Memos"
}

export interface AutoBackupSnapshot {
  id: string;
  timestamp: string;
  interval: BackupInterval;
  triggerType: 'scheduled' | 'manual';
  biltyCount: number;
  memoCount: number;
  partyCount: number;
  fileSizeKb: number;
  dataJson: string;
  note?: string;
}

export type StorageMode = 'browser-local' | 'custom-pc-directory' | 'hybrid';

export interface StorageConfig {
  mode: StorageMode;
  customDirectoryPath?: string; // e.g. "D:\TransportData" or "C:\BillingRecords"
  folderName?: string; // Display name of chosen PC directory
  hasDirectoryPermission?: boolean;
  autoSyncToFileSystem: boolean; // Auto-write json snapshot on each add/delete/update
  lastSyncedAt?: string;
  lastSyncStatus?: 'success' | 'failed';
  lastSyncMessage?: string;
  backupSubFolder?: string; // default "Daily_Backups"
}

export interface CompanySettings {
  companyName: string;
  tagline?: string;
  address: string;
  cityState: string;
  mobile: string;
  phone?: string;
  alternatePhone?: string;
  email: string;
  gstNumber: string;
  panNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  biltyPrefix: string;
  biltyNextNumber?: number;
  biltyStartingNumber?: number;
  memoPrefix: string;
  memoNextNumber?: number;
  memoStartingNumber?: number;
  medicalPrefix: string;
  medicalNextNumber?: number;
  medicalStartingNumber?: number;
  currencySymbol: string;
  dateFormat?: string;
  termsAndConditions: string;
  logoBase64?: string;
  operatingCities?: OperatingCity[];
  deletedCityNames?: string[];
  quickRoutes?: QuickRoute[];
  autoBackupConfig?: AutoBackupConfig;
  storageConfig?: StorageConfig;
}

export interface DatabaseDump {
  version: string;
  exportedAt: string;
  exportedBy: string;
  settings: CompanySettings;
  parties: Party[];
  vehicles: Vehicle[];
  drivers: Driver[];
  bilties: Bilty[];
  memos: Memo[];
  medicalEntries: MedicalEntry[];
  matchEntries: MatchEntry[];
  medicalMatchEntries: MedicalMatchEntry[];
  closedMonths: ClosedMonthRecord[];
  auditLogs: AuditLog[];
}
