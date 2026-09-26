/**
 * modules/auth/rateLimiter.js
 * ------------------------------------------------------------------
 * In-memory sliding-window rate limiter (zero external services).
 * Used to protect sensitive Server Actions: login and OTP generation.
 */
const buckets = new Map(); // key -> number[] (timestamps, ms)

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const BUCKET_TTL_MS = 60 * 60 * 1000; // drop idle buckets after 1h

function cleanup(now) {
  for (const [key, hits] of buckets) {
    const last = hits[hits.length - 1];
    if (!last || now - last > BUCKET_TTL_MS) buckets.delete(key);
  }
}
setInterval(() => cleanup(Date.now()), CLEANUP_INTERVAL_MS).unref();

/**
 * Records a hit and reports whether the caller is over the limit.
 * @param {string} key    identity of the caller (ip / ip+email)
 * @param {number} limit  max hits inside the window
 * @param {number} windowMs sliding window size in milliseconds
 * @returns {{allowed: boolean, retryAfterSec: number}}
 */
function consume(key, limit, windowMs) {
  const now = Date.now();
  let hits = buckets.get(key);
  if (!hits) {
    hits = [];
    buckets.set(key, hits);
  }
  while (hits.length && now - hits[0] >= windowMs) hits.shift();

  if (hits.length >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000));
    return { allowed: false, retryAfterSec };
  }
  hits.push(now);
  return { allowed: true, retryAfterSec: 0 };
}

/** Manually clear a caller's bucket (e.g. after a successful login). */
function reset(key) {
  buckets.delete(key);
}

module.exports = { consume, reset };
