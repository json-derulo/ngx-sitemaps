import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const distPath = resolve('dist');

try {
  await rm(distPath, { recursive: true, force: true });
  console.log('dist folder removed');
} catch (err) {
  if (err.code !== 'ENOENT') throw err; // Ignore if folder doesn't exist
}
