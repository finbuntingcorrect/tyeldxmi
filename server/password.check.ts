import assert from 'node:assert/strict';
import { hashPassword, normalizeLogin, validPassword, verifyPassword } from './password';

assert.equal(normalizeLogin('  Аня ')?.display, 'Аня');
assert.equal(normalizeLogin('  Аня ')?.key, 'аня');
assert.equal(normalizeLogin('аня')?.key, 'аня');
assert.equal(normalizeLogin('ab'), null);
assert.equal(normalizeLogin('a@b.ru'), null);
assert.equal(normalizeLogin('имя с пробелом'), null);
assert.equal(validPassword('12345'), false);
assert.equal(validPassword('123456'), true);
assert.equal(validPassword('x'.repeat(73)), false);

const hash = await hashPassword('secret12');
assert.notEqual(hash, 'secret12');
assert.equal(hash.startsWith('scrypt$'), true);
assert.equal(await verifyPassword('secret12', hash), true);
assert.equal(await verifyPassword('secret13', hash), false);
assert.equal(await verifyPassword('secret12', 'plain'), false);

console.log('password ok');
