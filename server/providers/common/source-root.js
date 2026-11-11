import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Resolve defaultSourceRoot for ESM context. A bundled Worker has no file URL
 * for this module (import.meta.url is empty there), so it falls back to "/".
 */
const here = import.meta.url
  ? path.dirname(fileURLToPath(import.meta.url))
  : '/server/providers/common';
const defaultSourceRoot = path.resolve(here, '../../..');

export { defaultSourceRoot };
