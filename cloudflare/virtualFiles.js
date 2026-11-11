// The camera loaders read a few JSON catalogs from disk. A Worker has no disk,
// so those files are bundled here and served through a patched readFileSync.
import fs from 'node:fs';
import quebec from '../public/quebec-cameras.json';
import world from '../config/cctv_sources.world-image-cameras.json';
import tallinn from '../config/cctv_sources.tallinn.json';

const FILES = new Map([
  ['quebec-cameras.json', JSON.stringify(quebec)],
  ['cctv_sources.world-image-cameras.json', JSON.stringify(world)],
  ['cctv_sources.tallinn.json', JSON.stringify(tallinn)],
]);

const original = fs.readFileSync?.bind(fs);
fs.readFileSync = (file, ...rest) => {
  const name = String(file).replace(/\\/g, '/').split('/').pop();
  if (FILES.has(name)) return FILES.get(name);
  if (original) return original(file, ...rest);
  throw Object.assign(new Error(`ENOENT: ${file}`), { code: 'ENOENT' });
};

const originalExists = fs.existsSync?.bind(fs);
fs.existsSync = (file) => {
  const name = String(file).replaceAll('\\', '/').split('/').pop();
  return FILES.has(name) || (originalExists ? originalExists(file) : false);
};
