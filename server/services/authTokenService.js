'use strict';
const crypto = require('crypto');
const { id, now } = require('../db');

const AUTH_TOKEN_TTL_MS = 30 * 60 * 1000;
const AUTH_TOKEN_PURPOSES = new Set(['password_reset', 'email_verification']);

function hashAuthToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function authTokenExpiry(createdAt = now()) {
  return new Date(Date.parse(createdAt) + AUTH_TOKEN_TTL_MS).toISOString();
}

function isAuthTokenUsable(record, at = now()) {
  if (!record || record.used_at) return false;
  return Date.parse(record.expires_at) > Date.parse(at);
}

async function invalidateAuthTokens(database, userId, purpose, at = now()) {
  await database.run(
    `UPDATE auth_tokens SET used_at=$1
     WHERE user_id=$2 AND purpose=$3 AND used_at IS NULL`,
    [at, userId, purpose],
  );
}

async function createAuthToken(database, userId, purpose, options = {}) {
  if (!AUTH_TOKEN_PURPOSES.has(purpose)) throw new Error(`Unsupported auth token purpose: ${purpose}`);
  const createdAt = options.createdAt || now();
  const token = (options.randomBytes || crypto.randomBytes)(32).toString('hex');
  const tokenHash = hashAuthToken(token);
  const expiresAt = authTokenExpiry(createdAt);

  await invalidateAuthTokens(database, userId, purpose, createdAt);
  await database.run(
    `INSERT INTO auth_tokens (id,user_id,token_hash,purpose,expires_at,used_at,created_at)
     VALUES ($1,$2,$3,$4,$5,NULL,$6)`,
    [id('tok'), userId, tokenHash, purpose, expiresAt, createdAt],
  );
  return { token, expiresAt };
}

async function consumeAuthToken(database, token, purpose, at = now()) {
  if (!AUTH_TOKEN_PURPOSES.has(purpose) || typeof token !== 'string' || !token) return null;
  const tokenHash = hashAuthToken(token);
  const consumed = await database.one(
    `UPDATE auth_tokens SET used_at=$1
     WHERE token_hash=$2 AND purpose=$3
       AND used_at IS NULL AND expires_at > $1
     RETURNING user_id`,
    [at, tokenHash, purpose],
  );
  if (!consumed) return null;
  return database.one('SELECT * FROM users WHERE id=$1', [consumed.user_id]);
}

module.exports = {
  AUTH_TOKEN_PURPOSES,
  AUTH_TOKEN_TTL_MS,
  authTokenExpiry,
  consumeAuthToken,
  createAuthToken,
  hashAuthToken,
  invalidateAuthTokens,
  isAuthTokenUsable,
};
