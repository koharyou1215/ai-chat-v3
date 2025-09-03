// Lightweight voice logger.
// Controls whether voice-related logs are printed via the VOICE_LOG environment variable.
// If VOICE_LOG === '1' then info/debug/log are printed; warn/error are always printed.
const enabled = process.env.VOICE_LOG === '1';

function formatArgs(args) {
  try {
    return args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  } catch (e) {
    return args.map(String).join(' ');
  }
}

module.exports = {
  debug: (...args) => {
    if (enabled) console.debug(...args);
  },
  info: (...args) => {
    if (enabled) console.log(...args);
  },
  log: (...args) => {
    if (enabled) console.log(...args);
  },
  warn: (...args) => {
    // Warnings should usually be visible even when VOICE_LOG is off
    console.warn(...args);
  },
  error: (...args) => {
    // Errors should always be visible
    console.error(...args);
  },
  // helper to conditionally format and send as info (used by patches)
  infof: (prefix, ...args) => {
    if (enabled) console.log(prefix, ...args);
  }
};
