import fs from 'node:fs';
import path from 'node:path';

export type AuthUser = {
  name: string;
  email: string;
  password: string;
  role: 'owner' | 'staff';
};

export type SeedCategory = {
  id: string;
  name: string;
};

export type SeedProduct = {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  category: string;
  price: number;
  stock: number;
  costPrice: number;
  description: string;
  barcode?: string;
};

export type SeedOrder = {
  id: string;
  orderNumber: string;
  status: 'PENDING_APPROVAL' | 'COMPLETED' | 'CANCELLED' | 'DRAFT';
};

export type SeedWorkspace = {
  runId: string;
  users: {
    owner: AuthUser;
    staff: AuthUser;
  };
  categories: {
    accessories: SeedCategory;
    devices: SeedCategory;
    consumables: SeedCategory;
  };
  products: SeedProduct[];
  orders: {
    pending: SeedOrder;
    completed: SeedOrder;
  };
};

export const authDir = path.join(process.cwd(), 'tests', '.auth');
export const ownerStorageStatePath = path.join(authDir, 'owner.storage.json');
export const staffStorageStatePath = path.join(authDir, 'staff.storage.json');
export const seedFilePath = path.join(authDir, 'workspace.seed.json');
export const defaultBaseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

export function loadSeedData(): SeedWorkspace {
  return JSON.parse(fs.readFileSync(seedFilePath, 'utf8')) as SeedWorkspace;
}

export function getTestUsers(): SeedWorkspace['users'] {
  return loadSeedData().users;
}
