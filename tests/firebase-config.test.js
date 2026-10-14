import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/check-firebase-config.js', import.meta.url));
const cwd = fileURLToPath(new URL('./fixtures/', import.meta.url));
const fields = ['API_KEY', 'AUTH_DOMAIN', 'PROJECT_ID', 'APP_ID'].map(name => `VITE_FIREBASE_${name}`);
const env = { ...process.env, ...Object.fromEntries(fields.map(name => [name, 'test-value'])) };

test('публікація зупиняється при відсутньому полі Firebase, значення не потрапляють у лог', () => {
  for (const field of fields) {
    const result = spawnSync(process.execPath, [script], { cwd, env: { ...env, [field]: ' ' }, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes(field));
    assert.ok(!result.stderr.includes('test-value'));
  }
});

test('повний конфіг Firebase дозволяє публікацію без показу ключів', () => {
  const result = spawnSync(process.execPath, [script], { cwd, env, encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.ok(!result.stdout.includes('test-value'));
});
