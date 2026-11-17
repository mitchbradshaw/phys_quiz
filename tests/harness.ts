// A tiny test harness: test('name', () => { near(x, 11186, 0.01); }).
type Fn = () => void;
const tests: { name: string; fn: Fn }[] = [];

export function test(name: string, fn: Fn) {
  tests.push({ name, fn });
}

/** |actual - expected| <= relTol * |expected| (or absTol when expected is 0). */
export function near(actual: number, expected: number, relTol = 1e-3, what = '') {
  const tol = expected === 0 ? relTol : Math.abs(expected) * relTol;
  if (!(Math.abs(actual - expected) <= tol)) {
    throw new Error(`${what ? what + ': ' : ''}expected ${expected} ± ${tol.toPrecision(3)}, got ${actual}`);
  }
}

export function isTrue(cond: boolean, what: string) {
  if (!cond) throw new Error(what);
}

export function run(filter = '') {
  let pass = 0;
  let fail = 0;
  for (const t of tests) {
    if (filter && !t.name.includes(filter)) continue;
    try {
      t.fn();
      pass++;
    } catch (e) {
      fail++;
      console.log(`FAIL ${t.name}\n     ${(e as Error).message}`);
    }
  }
  console.log(`[test] ${pass} passed, ${fail} failed`);
  (globalThis as unknown as { process: { exitCode: number } }).process.exitCode = fail ? 1 : 0;
}
