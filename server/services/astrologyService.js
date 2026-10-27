/**
 * server/services/astrologyService.js
 *
 * Computes Sun sign, Moon sign, and Ascendant (rising sign) from birth
 * date/time/location using the low-precision solar/lunar longitude
 * formulas from Meeus, "Astronomical Algorithms" (public-domain-standard
 * algorithms, not any specific ephemeris vendor's proprietary code).
 *
 * Precision, honestly stated:
 *  - Sun longitude: accurate to a few arc-seconds — sign + degree is reliable.
 *  - Moon longitude: truncated to the largest periodic terms, accurate to
 *    roughly ±0.3–0.6°. Since the Moon crosses a full sign every ~2.2 days,
 *    that's easily good enough except when the exact birth minute happens
 *    to sit within roughly an hour of a sign boundary — the same caveat
 *    that applies to any Moon-sign calculation given an imprecise birth time.
 *  - Ascendant: exact given the inputs, but is *very* sensitive to birth
 *    time (roughly 1° of drift per 4 minutes of error), and requires
 *    latitude/longitude. Mercury/Venus/Mars/Jupiter/Saturn positions are
 *    not yet implemented — see TODO below.
 *
 * TODO(planets): Mercury–Saturn geocentric longitudes need full VSOP87 (or
 * an ephemeris library like `astronomy-engine`) rather than the Sun/Moon
 * shortcuts above; deferred to keep this dependency-free for now.
 */
'use strict';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const norm360 = (x) => ((x % 360) + 360) % 360;

const ZODIAC = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

function toJulianDate(utcDate) {
  return utcDate.getTime() / 86400000 + 2440587.5;
}

function julianCenturiesSinceJ2000(jd) {
  return (jd - 2451545.0) / 36525;
}

function sunEclipticLongitude(T) {
  const L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const Mr = M * RAD;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr)
    + 0.000289 * Math.sin(3 * Mr);
  return norm360(L0 + C);
}

function moonEclipticLongitude(T) {
  const Lp = norm360(218.3164477 + 481267.88123421 * T);
  const D = norm360(297.8501921 + 445267.1114034 * T) * RAD;
  const M = norm360(357.5291092 + 35999.0502909 * T) * RAD;
  const Mp = norm360(134.9633964 + 477198.8675055 * T) * RAD;
  const F = norm360(93.2720950 + 483202.0175233 * T) * RAD;

  const dL = 6.288774 * Math.sin(Mp)
    + 1.274027 * Math.sin(2 * D - Mp)
    + 0.658314 * Math.sin(2 * D)
    + 0.213618 * Math.sin(2 * Mp)
    - 0.185116 * Math.sin(M)
    - 0.114332 * Math.sin(2 * F)
    + 0.058793 * Math.sin(2 * D - 2 * Mp)
    + 0.057066 * Math.sin(2 * D - M - Mp)
    + 0.053322 * Math.sin(2 * D + Mp)
    + 0.045758 * Math.sin(2 * D - M)
    - 0.040923 * Math.sin(M - Mp)
    - 0.034720 * Math.sin(D)
    - 0.030383 * Math.sin(M + Mp);

  return norm360(Lp + dL);
}

function obliquityOfEcliptic(T) {
  return 23.439291 - 0.0130042 * T - 0.00000016 * T * T + 0.000000504 * T * T * T;
}

function greenwichMeanSiderealTime(jd, T) {
  const gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0)
    + 0.000387933 * T * T - (T * T * T) / 38710000;
  return norm360(gmst);
}

function ascendantLongitude(lstDeg, latDeg, epsDeg) {
  const lst = lstDeg * RAD, lat = latDeg * RAD, eps = epsDeg * RAD;
  const y = -Math.cos(lst);
  const x = Math.sin(lst) * Math.cos(eps) + Math.tan(lat) * Math.sin(eps);
  return norm360(Math.atan2(y, x) * DEG);
}

function signFromLongitude(lon) {
  const idx = Math.floor(norm360(lon) / 30);
  const degreeInSign = norm360(lon) - idx * 30;
  return { sign: ZODIAC[idx], degreeInSign: Math.round(degreeInSign * 100) / 100 };
}

/**
 * @param {object} input
 * @param {string} input.birthDate   'YYYY-MM-DD'
 * @param {string} [input.birthTime] 'HH:mm', defaults to '12:00' (noon) if omitted
 * @param {number} [input.latitude]
 * @param {number} [input.longitude]
 * @param {number} [input.timezoneOffsetMinutes] minutes EAST of UTC (e.g. +480 for UTC+8); defaults to 0
 */
function computeNatalChart(input) {
  const { birthDate, latitude, longitude } = input;
  const birthTime = input.birthTime || '12:00';
  const tzOffset = Number.isFinite(input.timezoneOffsetMinutes) ? input.timezoneOffsetMinutes : 0;
  const timeProvided = !!input.birthTime;
  const locationProvided = Number.isFinite(latitude) && Number.isFinite(longitude);

  const [y, m, d] = birthDate.split('-').map(Number);
  const [hh, mm] = birthTime.split(':').map(Number);
  const localAsUtcMs = Date.UTC(y, m - 1, d, hh, mm, 0);
  const utcMs = localAsUtcMs - tzOffset * 60000;
  const utcDate = new Date(utcMs);

  const jd = toJulianDate(utcDate);
  const T = julianCenturiesSinceJ2000(jd);

  const sunLon = sunEclipticLongitude(T);
  const moonLon = moonEclipticLongitude(T);
  const eps = obliquityOfEcliptic(T);

  const result = {
    utcDate: utcDate.toISOString(),
    sun: { ...signFromLongitude(sunLon), longitude: Math.round(sunLon * 100) / 100 },
    moon: { ...signFromLongitude(moonLon), longitude: Math.round(moonLon * 100) / 100, precisionNote: 'Approximate (\u00b10.3\u20130.6\u00b0); confirm with an exact time if you\u2019re near a sign boundary.' },
    ascendant: null,
    caveats: [],
  };

  if (!timeProvided) result.caveats.push('No birth time given — Sun sign is exact, but Moon sign and Ascendant assume noon and may be inaccurate.');
  if (!locationProvided) {
    result.caveats.push('No birth location given — Ascendant could not be calculated.');
  } else {
    const gmst = greenwichMeanSiderealTime(jd, T);
    const lst = norm360(gmst + longitude); // east longitude positive
    const ascLon = ascendantLongitude(lst, latitude, eps);
    result.ascendant = { ...signFromLongitude(ascLon), longitude: Math.round(ascLon * 100) / 100 };
    if (!timeProvided) result.ascendant.precisionNote = 'Unreliable without an exact birth time — the Ascendant moves ~1° every 4 minutes.';
  }

  result.planetsNote = 'Mercury, Venus, Mars, Jupiter, and Saturn positions are not yet implemented in this build.';
  return result;
}

module.exports = { computeNatalChart, signFromLongitude, ZODIAC };
