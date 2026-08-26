const THRESHOLD = 3;
const COOLDOWN_MS = 5 * 60 * 1000;

let consecutiveFailures = 0;
let trippedAt: number | null = null;

export function recordAiSuccess() {
  consecutiveFailures = 0;
  trippedAt = null;
}

export function recordAiFailure() {
  consecutiveFailures++;
  if (consecutiveFailures >= THRESHOLD) {
    trippedAt = Date.now();
  }
}

export function isAiAvailable(): boolean {
  if (trippedAt === null) return true;
  if (Date.now() - trippedAt > COOLDOWN_MS) {
    consecutiveFailures = 0;
    trippedAt = null;
    return true;
  }
  return false;
}

export function aiCooldownRemaining(): number {
  if (trippedAt === null) return 0;
  const remaining = COOLDOWN_MS - (Date.now() - trippedAt);
  return remaining > 0 ? remaining : 0;
}
