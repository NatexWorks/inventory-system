import type { APIRequestContext, APIResponse } from '@playwright/test';
import { expect, request as playwrightRequest } from '@playwright/test';
import fs from 'node:fs';
import { defaultBaseUrl, ownerStorageStatePath, staffStorageStatePath } from './testData';

export async function parseJson<T = Record<string, unknown>>(response: APIResponse): Promise<T> {
  return (await response.json()) as T;
}

export async function createApiContext(storageStatePath: string | undefined = undefined): Promise<APIRequestContext> {
  const resolvedStorageState = storageStatePath && fs.existsSync(storageStatePath) ? storageStatePath : undefined;

  return playwrightRequest.newContext({
    baseURL: defaultBaseUrl,
    storageState: resolvedStorageState,
  });
}

export async function withApiContext<T>(
  storageStatePath: string | undefined,
  run: (context: APIRequestContext) => Promise<T>
): Promise<T> {
  const context = await createApiContext(storageStatePath);
  try {
    return await run(context);
  } finally {
    await context.dispose();
  }
}

export async function expectSuccess(response: APIResponse, status = 200) {
  expect(response.status()).toBe(status);
  const payload = await parseJson(response);
  expect(payload).toMatchObject({
    success: true,
  });
  expect(typeof payload.message).toBe('string');
  return payload;
}

export async function expectFailure(response: APIResponse, status: number) {
  expect(response.status()).toBe(status);
  const payload = await parseJson(response);
  expect(payload).toMatchObject({
    success: false,
  });
  expect(typeof payload.message).toBe('string');
  return payload;
}

export function statePathForRole(role: 'owner' | 'staff') {
  return role === 'owner' ? ownerStorageStatePath : staffStorageStatePath;
}
