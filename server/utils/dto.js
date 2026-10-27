'use strict';

function toCamelKey(key) {
  return key.replace(/_+([a-zA-Z0-9])/g, (_, character) => character.toUpperCase());
}

function toApiDto(value) {
  if (Array.isArray(value)) return value.map(toApiDto);
  if (value === null || typeof value !== 'object') return value;

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [toCamelKey(key), toApiDto(entry)]),
  );
}

function dtoResponse(_req, res, next) {
  const json = res.json.bind(res);
  res.json = (payload) => json(toApiDto(payload));
  next();
}

module.exports = { dtoResponse, toApiDto, toCamelKey };
