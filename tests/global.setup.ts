import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { defaultBaseUrl, authDir, seedFilePath, ownerStorageStatePath, staffStorageStatePath } from './fixtures/testData';

type SeededUser = {
  name: string;
  email: string;
  password: string;
  role: 'owner' | 'staff';
};

function buildAuthState(setCookie: string, baseUrl: string) {
  const [cookiePair] = setCookie.split(';');
  const [name, ...valueParts] = cookiePair.split('=');
  const value = valueParts.join('=');
  const url = new URL(baseUrl);

  return {
    cookies: [
      {
        name: name.trim(),
        value: value.trim(),
        domain: url.hostname,
        path: '/',
        expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
        httpOnly: true,
        secure: url.protocol === 'https:',
        sameSite: 'Lax' as const,
      },
    ],
    origins: [],
  };
}

async function postJson(baseUrl: string, pathname: string, body: unknown, cookie?: string) {
  const response = await fetch(new URL(pathname, baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);
  return { response, payload };
}

async function putJson(baseUrl: string, pathname: string, body: unknown, cookie?: string) {
  const response = await fetch(new URL(pathname, baseUrl), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);
  return { response, payload };
}

async function signupUser(baseUrl: string, user: SeededUser) {
  const signup = await postJson(baseUrl, '/api/auth/signup', user);
  if (!signup.response.ok) {
    const login = await postJson(baseUrl, '/api/auth/login', { email: user.email, password: user.password });
    if (!login.response.ok) {
      throw new Error(`Unable to create test user ${user.email}`);
    }

    const cookie = login.response.headers.get('set-cookie');
    if (!cookie) {
      throw new Error('Missing auth cookie from login response');
    }

    return buildAuthState(cookie, baseUrl);
  }

  const cookie = signup.response.headers.get('set-cookie');
  if (!cookie) {
    throw new Error('Missing auth cookie from signup response');
  }

  return buildAuthState(cookie, baseUrl);
}

async function seedWorkspaceData(baseUrl: string, ownerCookie: string, runId: string) {
  const categoryFixtures = [
    { key: 'accessories', name: `Accessories ${runId}` },
    { key: 'devices', name: `Devices ${runId}` },
    { key: 'consumables', name: `Consumables ${runId}` },
  ] as const;

  const categories: Record<string, { id: string; name: string }> = {};
  for (const category of categoryFixtures) {
    const { response, payload } = await postJson(baseUrl, '/api/category', { name: category.name, description: `${category.name} category` }, ownerCookie);
    if (!response.ok) {
      throw new Error(`Failed to create category ${category.name}: ${JSON.stringify(payload)}`);
    }

    categories[category.key] = {
      id: payload.data.category._id,
      name: payload.data.category.name,
    };
  }

  const productFixtures = [
    { name: `Wireless Mouse ${runId}`, sku: `MOUSE-${runId}`, categoryKey: 'devices', price: 799, stock: 4, costPrice: 499, description: 'Ergonomic wireless mouse' },
    { name: `USB-C Cable ${runId}`, sku: `CABLE-${runId}`, categoryKey: 'accessories', price: 199, stock: 12, costPrice: 80, description: 'Durable charging cable' },
    { name: `Printer Ink ${runId}`, sku: `INK-${runId}`, categoryKey: 'consumables', price: 899, stock: 2, costPrice: 550, description: 'Ink cartridge refill' },
    { name: `Bluetooth Keyboard ${runId}`, sku: `KEY-${runId}`, categoryKey: 'devices', price: 1299, stock: 6, costPrice: 900, description: 'Slim keyboard' },
    { name: `Notebook ${runId}`, sku: `NOTE-${runId}`, categoryKey: 'consumables', price: 49, stock: 20, costPrice: 20, description: 'A5 ruled notebook' },
    { name: `Barcode Scanner ${runId}`, sku: `SCAN-${runId}`, categoryKey: 'devices', price: 4999, stock: 3, costPrice: 3700, description: 'Handheld scanner', barcode: `SCAN-${runId}-001` },
    { name: `Headset ${runId}`, sku: `HEAD-${runId}`, categoryKey: 'accessories', price: 1499, stock: 8, costPrice: 900, description: 'USB headset' },
    { name: `Monitor ${runId}`, sku: `MON-${runId}`, categoryKey: 'devices', price: 8999, stock: 6, costPrice: 7200, description: '24 inch monitor' },
    { name: `Packing Tape ${runId}`, sku: `TAPE-${runId}`, categoryKey: 'consumables', price: 89, stock: 15, costPrice: 30, description: 'Shipping tape' },
    { name: `Label Roll ${runId}`, sku: `LABEL-${runId}`, categoryKey: 'consumables', price: 199, stock: 5, costPrice: 75, description: 'Barcode label roll' },
    { name: `Adapter ${runId}`, sku: `ADAPT-${runId}`, categoryKey: 'accessories', price: 299, stock: 11, costPrice: 120, description: 'Universal adapter' },
    { name: `Webcam ${runId}`, sku: `CAM-${runId}`, categoryKey: 'devices', price: 2499, stock: 5, costPrice: 1800, description: 'HD webcam' },
  ];

  const products: Array<{
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
  }> = [];

  for (const product of productFixtures) {
    const category = categories[product.categoryKey];
    const { response, payload } = await postJson(
      baseUrl,
      '/api/product',
      {
        name: product.name,
        price: product.price,
        stock: product.stock,
        costPrice: product.costPrice,
        categoryId: category.id,
        category: category.name,
        sku: product.sku,
        description: product.description,
        barcodes: product.barcode ? [{ code: product.barcode, state: 'AVAILABLE' }] : [],
      },
      ownerCookie
    );

    if (!response.ok) {
      throw new Error(`Failed to create product ${product.name}: ${JSON.stringify(payload)}`);
    }

    products.push({
      id: payload.data.product._id,
      name: payload.data.product.name,
      sku: payload.data.product.sku,
      categoryId: category.id,
      category: category.name,
      price: product.price,
      stock: product.stock,
      costPrice: product.costPrice,
      description: product.description,
      barcode: product.barcode,
    });
  }

  const settingsResponse = await putJson(
    baseUrl,
    '/api/settings',
    {
      inventory: {
        lowStockThreshold: 5,
        barcodeRules: 'Unique barcodes per sellable unit',
        autoBarcodeGeneration: false,
      },
      billing: {
        invoiceEnabled: true,
        taxPercentage: 12,
        invoiceFormat: 'detailed',
      },
      system: {
        offlineMode: true,
        sessionTimeoutMinutes: 30,
      },
    },
    ownerCookie
  );

  if (!settingsResponse.response.ok) {
    throw new Error(`Failed to seed settings: ${JSON.stringify(settingsResponse.payload)}`);
  }

  const completedOrderResponse = await postJson(
    baseUrl,
    '/api/orders',
    {
      customerName: 'Seeded Customer',
      items: [
        {
          productId: products[0].id,
          name: products[0].name,
          quantity: 1,
          price: products[0].price,
          lineTotal: products[0].price,
        },
        {
          productId: products[1].id,
          name: products[1].name,
          quantity: 2,
          price: products[1].price,
          lineTotal: products[1].price * 2,
        },
      ],
      subtotal: products[0].price + products[1].price * 2,
      taxAmount: 0,
      totalAmount: products[0].price + products[1].price * 2,
      status: 'PENDING_APPROVAL',
    },
    ownerCookie
  );

  if (!completedOrderResponse.response.ok) {
    throw new Error(`Failed to create pending order: ${JSON.stringify(completedOrderResponse.payload)}`);
  }

  const pendingOrder = completedOrderResponse.payload.data.order;
  const completedResponse = await fetch(new URL(`/api/orders/${pendingOrder._id}`, baseUrl), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: ownerCookie,
    },
    body: JSON.stringify({ status: 'COMPLETED' }),
  });
  const completedPayload = await completedResponse.json().catch(() => null);
  if (!completedResponse.ok) {
    throw new Error(`Failed to mark seeded order completed: ${JSON.stringify(completedPayload)}`);
  }

  const pendingOrderResponse = await postJson(
    baseUrl,
    '/api/orders',
    {
      customerName: 'Pending Review',
      items: [
        {
          productId: products[2].id,
          name: products[2].name,
          quantity: 1,
          price: products[2].price,
          lineTotal: products[2].price,
        },
      ],
      subtotal: products[2].price,
      taxAmount: 0,
      totalAmount: products[2].price,
      status: 'PENDING_APPROVAL',
    },
    ownerCookie
  );

  if (!pendingOrderResponse.response.ok) {
    throw new Error(`Failed to create pending review order: ${JSON.stringify(pendingOrderResponse.payload)}`);
  }

  return {
    categories: {
      accessories: categories.accessories,
      devices: categories.devices,
      consumables: categories.consumables,
    },
    products,
    orders: {
      completed: {
        id: pendingOrder._id,
        orderNumber: pendingOrder.orderNumber,
        status: 'COMPLETED' as const,
      },
      pending: {
        id: pendingOrderResponse.payload.data.order._id,
        orderNumber: pendingOrderResponse.payload.data.order.orderNumber,
        status: 'PENDING_APPROVAL' as const,
      },
    },
  };
}

export default async function globalSetup() {
  await fs.mkdir(authDir, { recursive: true });

  const runId = crypto.randomUUID().slice(0, 8).toUpperCase();
  const owner = {
    name: `Owner ${runId}`,
    email: `owner-${runId.toLowerCase()}@example.com`,
    password: 'Password123!',
    role: 'owner' as const,
  };
  const staff = {
    name: `Staff ${runId}`,
    email: `staff-${runId.toLowerCase()}@example.com`,
    password: 'Password123!',
    role: 'staff' as const,
  };

  const ownerState = await signupUser(defaultBaseUrl, owner);
  const staffState = await signupUser(defaultBaseUrl, staff);

  await fs.writeFile(ownerStorageStatePath, JSON.stringify(ownerState, null, 2), 'utf8');
  await fs.writeFile(staffStorageStatePath, JSON.stringify(staffState, null, 2), 'utf8');

  const ownerCookie = `${ownerState.cookies[0].name}=${ownerState.cookies[0].value}`;
  const workspace = await seedWorkspaceData(defaultBaseUrl, ownerCookie, runId);

  await fs.writeFile(
    seedFilePath,
    JSON.stringify(
      {
        runId,
        users: { owner, staff },
        ...workspace,
      },
      null,
      2
    ),
    'utf8'
  );
}
