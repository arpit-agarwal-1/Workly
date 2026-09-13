const { test } = require('node:test');
const assert = require('node:assert/strict');

const { hashPassword, verifyPassword } = require('../src/utils/password');

test('valid password produces a hash', async () => {
  const password = 'StrongPass!123';
  const hash = await hashPassword(password);

  assert.equal(typeof hash, 'string');
  assert.ok(hash.length > 0);
  assert.ok(hash.startsWith('$argon2id$'));
});

test('hash is different from plaintext', async () => {
  const password = 'StrongPass!123';
  const hash = await hashPassword(password);

  assert.notEqual(hash, password);
});

test('hash uses Argon2id', async () => {
  const password = 'StrongPass!123';
  const hash = await hashPassword(password);

  assert.match(hash, /^\$argon2id\$/);
  assert.match(hash, /m=65536,p=1,t=3/);
});

test('same password can be verified successfully', async () => {
  const password = 'StrongPass!123';
  const hash = await hashPassword(password);

  assert.equal(await verifyPassword(password, hash), true);
});

test('wrong password returns false', async () => {
  const password = 'StrongPass!123';
  const wrongPassword = 'WrongPass!123';
  const hash = await hashPassword(password);

  assert.equal(await verifyPassword(wrongPassword, hash), false);
});

test('generated hashes contain a salt and are not identical when hashing the same password twice', async () => {
  const password = 'StrongPass!123';
  const firstHash = await hashPassword(password);
  const secondHash = await hashPassword(password);

  assert.notEqual(firstHash, secondHash);
  assert.match(firstHash, /\$argon2id\$v=19\$m=65536,p=1,t=3\$[A-Za-z0-9+/]+\$/);
  assert.match(secondHash, /\$argon2id\$v=19\$m=65536,p=1,t=3\$[A-Za-z0-9+/]+\$/);
});

test('invalid/non-string password is rejected', async () => {
  await assert.rejects(() => hashPassword(null), /Password must be a string/i);
  await assert.rejects(() => hashPassword(undefined), /Password must be a string/i);
  await assert.rejects(() => hashPassword(123), /Password must be a string/i);
  await assert.rejects(() => verifyPassword(null, '$argon2id$v=19$m=65536,t=3,p=1$test$test'), /Password must be a string/i);
});

test('empty password is rejected', async () => {
  await assert.rejects(() => hashPassword(''), /Password must not be empty/i);
  await assert.rejects(() => verifyPassword('', '$argon2id$v=19$m=65536,t=3,p=1$test$test'), /Password must not be empty/i);
});

test('invalid/malformed hash is handled safely', async () => {
  const malformedHash = '$argon2id$not-a-valid-hash';

  assert.equal(await verifyPassword('StrongPass!123', malformedHash), false);
  await assert.rejects(() => verifyPassword('StrongPass!123', 123), /Password hash must be a non-empty string/i);
  await assert.rejects(() => verifyPassword('StrongPass!123', ''), /Password hash must be a non-empty string/i);
});

test('password verification does not mutate the input', async () => {
  const password = 'StrongPass!123';
  const original = password;
  const hash = await hashPassword(password);

  const verified = await verifyPassword(password, hash);

  assert.equal(verified, true);
  assert.equal(password, original);
  assert.equal(password, 'StrongPass!123');
});
