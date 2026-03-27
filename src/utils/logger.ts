/**
 * Production-safe logger.
 * - In development: logs everything to the console.
 * - In production: only errors are logged; debug/info/warn are silent.
 *
 * Usage:
 *   import { logger } from "../utils/logger";
 *   logger.info("Payment initiated", { bookingId });
 *   logger.error("Payment failed", error);
 */

const isDev = import.meta.env.DEV;

/* eslint-disable no-console */
export const logger = {
  debug: isDev ? console.debug.bind(console) : () => {},
  info:  isDev ? console.info.bind(console)  : () => {},
  log:   isDev ? console.log.bind(console)   : () => {},
  warn:  isDev ? console.warn.bind(console)  : () => {},
  /** Always logged — captured by Sentry in production. */
  error: console.error.bind(console),
} as const;
/* eslint-enable no-console */
