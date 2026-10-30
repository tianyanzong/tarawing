'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  AUTH_TOKEN_TTL_MS,
  authTokenExpiry,
  hashAuthToken,
  isAuthTokenUsable,
} = require('../services/authTokenService');

test('hashes auth tokens without storing the raw token', () => {
  const token = 'raw-reset-token';
  const hash = hashAuthToken(token);

  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.notEqual(hash, token);
  assert.equal(hash, hashAuthToken(token));
});

test('auth tokens expire after thirty minutes and reject used records', () => {
  const createdAt = '2026-10-30T00:00:00.000Z';
  const expiresAt = authTokenExpiry(createdAt);

  assert.equal(Date.parse(expiresAt) - Date.parse(createdAt), AUTH_TOKEN_TTL_MS);
  assert.equal(isAuthTokenUsable({ used_at: null, expires_at: expiresAt }, createdAt), true);
  assert.equal(isAuthTokenUsable({ used_at: createdAt, expires_at: expiresAt }, createdAt), false);
  assert.equal(isAuthTokenUsable({ used_at: null, expires_at: expiresAt }, expiresAt), false);
});
