// Type-checks src/ and tests/ with tsc (strict, no emit).
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tsc = createRequire(path.join(ROOT, 'package.json')).resolve('typescript/lib/tsc.js');
const r = spawnSync(process.execPath, [tsc, '-p', path.join(ROOT, 'tsconfig.json'), '--pretty', 'false'], { stdio: 'inherit' });
if (r.status === 0) console.log('[typecheck] ok');
process.exitCode = r.status ?? 1;
