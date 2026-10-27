const USER_TOKEN_KEY = 'tarawing_token';
const ADMIN_TOKEN_KEY = 'tarawing_admin_token';

function read(key: string) {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(key);
}

function write(key: string, value: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, value);
}

function remove(key: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(key);
}

export function getUserToken() {
  return read(USER_TOKEN_KEY);
}

export function setUserToken(token: string) {
  write(USER_TOKEN_KEY, token);
}

export function clearUserToken() {
  remove(USER_TOKEN_KEY);
}

export function getAdminToken() {
  return read(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string) {
  write(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  remove(ADMIN_TOKEN_KEY);
}
