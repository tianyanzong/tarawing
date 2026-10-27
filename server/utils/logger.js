/**
 * server/utils/logger.js — zero-dependency structured logger.
 * LOG_FORMAT=text (dev default) | json (prod default, one JSON object per line).
 * LOG_HTTP=true enables one-line-per-request access logs with X-Request-Id.
 */
'use strict';

const FORMAT = process.env.LOG_FORMAT || (process.env.NODE_ENV === 'production' ? 'json' : 'text');
const HTTP_ON = process.env.LOG_HTTP != null
  ? process.env.LOG_HTTP === 'true'
  : FORMAT === 'json';

function normalizeErr(err) {
  if (!(err instanceof Error)) return err;
  return { name: err.name, message: err.message, stack: err.stack, code: err.code };
}

function emit(level, msg, meta = {}) {
  const ts = new Date().toISOString();
  const clean = { ...meta };
  if (clean.err) clean.err = normalizeErr(clean.err);
  if (FORMAT === 'json') {
    const line = JSON.stringify({ ts, level, msg, ...clean });
    if (level === 'error') process.stderr.write(line + '\n');
    else process.stdout.write(line + '\n');
  } else {
    const kv = Object.entries(clean).map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' ');
    const line = `${ts} [${level}] ${msg}${kv ? ' ' + kv : ''}`;
    if (level === 'error') console.error(line);
    else console.log(line);
  }
}

const logger = {
  info: (msg, meta) => emit('info', msg, meta),
  warn: (msg, meta) => emit('warn', msg, meta),
  error: (msg, meta) => emit('error', msg, meta),
  debug: (msg, meta) => { if (process.env.NODE_ENV !== 'production') emit('debug', msg, meta); },
};

function requestId() {
  return require('crypto').randomBytes(8).toString('hex');
}

function httpLogger(req, res, next) {
  const id = req.headers['x-request-id'] || requestId();
  req.reqId = id;
  res.setHeader('X-Request-Id', id);
  if (!HTTP_ON) return next();
  const start = Date.now();
  res.on('finish', () => {
    logger.info('http', {
      reqId: id, method: req.method, path: req.path,
      status: res.statusCode, ms: Date.now() - start,
      user: req.user?.id || req.admin?.id || undefined,
    });
  });
  next();
}

module.exports = { logger, httpLogger };
