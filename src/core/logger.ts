// ============================================================================
// Tagged Logger — tagged by module id for traceability
// Both modules (profiles, habits) import this via @core/logger
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Minimum log level — set via env var or default to 'info' in production
const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: unknown;
}

/**
 * Create a module-scoped logger.
 * Usage: const log = getLogger('profiles'); log.info('Profile created', { id: 1 });
 */
export function getLogger(module: string) {
  return {
    debug(message: string, data?: unknown) {
      _log({ timestamp: new Date().toISOString(), level: 'debug', module, message, data });
    },
    info(message: string, data?: unknown) {
      _log({ timestamp: new Date().toISOString(), level: 'info', module, message, data });
    },
    warn(message: string, data?: unknown) {
      _log({ timestamp: new Date().toISOString(), level: 'warn', module, message, data });
    },
    error(message: string, data?: unknown) {
      _log({ timestamp: new Date().toISOString(), level: 'error', module, message, data });
    },
  };
}

function _log(entry: LogEntry): void {
  if (LEVELS[entry.level] < LEVELS[MIN_LEVEL]) return;

  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.module}]`;

  switch (entry.level) {
    case 'error':
      console.error(prefix, entry.message, entry.data !== undefined ? entry.data : '');
      break;
    case 'warn':
      console.warn(prefix, entry.message, entry.data !== undefined ? entry.data : '');
      break;
    default:
      console.log(prefix, entry.message, entry.data !== undefined ? JSON.stringify(entry.data) : '');
  }
}