import fs from 'node:fs/promises';
import { authDir } from './fixtures/testData';

export default async function globalTeardown() {
  await fs.rm(authDir, { recursive: true, force: true });
}
