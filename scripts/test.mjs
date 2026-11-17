// Physics checks under Node: bundles every tests/*.test.ts with esbuild and runs them.
//   node scripts/test.mjs            run everything
//   node scripts/test.mjs cannon     only tests whose name contains "cannon"
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testsDir = path.join(ROOT, 'tests');
const files = fs.readdirSync(testsDir).filter((f) => f.endsWith('.test.ts'));
const out = path.join(ROOT, '.cache', 'tests.mjs');
await esbuild.build({
  stdin: {
    contents: `${files.map((f) => `import './${f}';`).join('\n')}\nimport { run } from './harness';\nrun(${JSON.stringify(process.argv[2] ?? '')});\n`,
    resolveDir: testsDir,
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: out,
  logLevel: 'warning',
});
await import(pathToFileURL(out).href);
