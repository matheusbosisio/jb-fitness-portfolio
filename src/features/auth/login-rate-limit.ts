const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const MAX_TRACKED_ORIGINS = 10_000;

type Attempt = { failures: number; resetAt: number };

export class LoginRateLimiter {
  private attempts = new Map<string, Attempt>();

  isBlocked(key: string, now = Date.now()) {
    const attempt = this.attempts.get(key);
    if (!attempt || attempt.resetAt <= now) {
      if (attempt) this.attempts.delete(key);
      return false;
    }
    return attempt.failures >= MAX_FAILURES;
  }

  recordFailure(key: string, now = Date.now()) {
    if (!this.attempts.has(key) && this.attempts.size >= MAX_TRACKED_ORIGINS) {
      for (const [storedKey, attempt] of this.attempts) {
        if (attempt.resetAt <= now) this.attempts.delete(storedKey);
      }
      if (this.attempts.size >= MAX_TRACKED_ORIGINS) {
        const oldestKey = this.attempts.keys().next().value;
        if (oldestKey) this.attempts.delete(oldestKey);
      }
    }
    const attempt = this.attempts.get(key);
    if (!attempt || attempt.resetAt <= now) {
      this.attempts.set(key, { failures: 1, resetAt: now + WINDOW_MS });
      return;
    }
    attempt.failures += 1;
  }

  clear(key: string) {
    this.attempts.delete(key);
  }
}

export const loginRateLimiter = new LoginRateLimiter();
