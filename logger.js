const fs = require('fs');
const path = require('path');
const clc = require('cli-color');

const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleDebug = console.debug;

// Ensure logs directory exists
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Log streams
const appLogStream = fs.createWriteStream(path.join(logDir, 'application.log'), { flags: 'a' });
const errorLogStream = fs.createWriteStream(path.join(logDir, 'error.log'), { flags: 'a' });
const debugLogStream = fs.createWriteStream(path.join(logDir, 'debug.log'), { flags: 'a' });

const getTimestamp = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
};

const formatMessage = (level, message, obj = null) => {
    let formatted = `[${getTimestamp()}] [${level}] ${message}`;
    if (obj) {
        if (obj instanceof Error) {
            formatted += `\n${obj.stack}`;
        } else if (typeof obj === 'object') {
            formatted += `\n${JSON.stringify(obj, null, 2)}`;
        } else {
            formatted += ` ${obj}`;
        }
    }
    return formatted;
};

const isDebugEnabled = process.env.DEBUG === 'true' || process.env.DEBUG_MODE === 'true';

const logger = {
    info: (message, obj = null) => {
        const logMsg = formatMessage('INFO', message, obj);
        originalConsoleLog(clc.cyanBright(`[${getTimestamp()}] `) + clc.bgCyan.black(` INFO `) + ` ${message}` + (obj ? `\n${typeof obj === 'object' ? JSON.stringify(obj, null, 2) : obj}` : ''));
        appLogStream.write(logMsg + '\n');
    },

    success: (message, obj = null) => {
        const logMsg = formatMessage('SUCCESS', message, obj);
        originalConsoleLog(clc.greenBright(`[${getTimestamp()}] `) + clc.bgGreen.black(` SUCCESS `) + ` ${message}` + (obj ? `\n${typeof obj === 'object' ? JSON.stringify(obj, null, 2) : obj}` : ''));
        appLogStream.write(logMsg + '\n');
    },

    warn: (message, obj = null) => {
        const logMsg = formatMessage('WARN', message, obj);
        originalConsoleWarn(clc.yellowBright(`[${getTimestamp()}] `) + clc.bgYellow.black(` WARN `) + ` ${message}` + (obj ? `\n${typeof obj === 'object' ? JSON.stringify(obj, null, 2) : obj}` : ''));
        appLogStream.write(logMsg + '\n');
    },

    error: (message, obj = null) => {
        const logMsg = formatMessage('ERROR', message, obj);
        originalConsoleError(clc.redBright(`[${getTimestamp()}] `) + clc.bgRed.black.bold(` ERROR `) + ` ${message}` + (obj ? (obj instanceof Error ? `\n${clc.red(obj.stack)}` : `\n${JSON.stringify(obj, null, 2)}`) : ''));
        appLogStream.write(logMsg + '\n');
        errorLogStream.write(logMsg + '\n');
    },

    debug: (message, obj = null) => {
        const logMsg = formatMessage('DEBUG', message, obj);
        debugLogStream.write(logMsg + '\n');
        
        if (isDebugEnabled) {
            originalConsoleDebug(clc.magentaBright(`[${getTimestamp()}] `) + clc.bgMagenta.black(` DEBUG `) + ` ${message}` + (obj ? `\n${typeof obj === 'object' ? JSON.stringify(obj, null, 2) : obj}` : ''));
            appLogStream.write(logMsg + '\n');
        }
    },

    // Specific function for database queries
    db: (query, params = null) => {
        const logMsg = formatMessage('DB', query, params);
        debugLogStream.write(logMsg + '\n');
        
        if (isDebugEnabled) {
            originalConsoleLog(clc.blueBright(`[${getTimestamp()}] `) + clc.bgBlue.black(` DB `) + ` ${query}` + (params ? ` [Params: ${JSON.stringify(params)}]` : ''));
            appLogStream.write(logMsg + '\n');
        }
    }
};

// Global console overrides to apply logging to the entire project automatically
console.log = function(...args) {
    originalConsoleLog.apply(console, args);
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
    originalConsoleLog(clc.cyanBright(`[${getTimestamp()}] `) + clc.bgCyan.black(` INFO `) + ` ${msg}`);
    appLogStream.write(formatMessage('INFO', msg) + '\n');
};

console.error = function(...args) {
    originalConsoleError.apply(console, args);
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
    originalConsoleError(clc.redBright(`[${getTimestamp()}] `) + clc.bgRed.black.bold(` ERROR `) + ` ${msg}`);
    const logMsg = formatMessage('ERROR', msg);
    appLogStream.write(logMsg + '\n');
    errorLogStream.write(logMsg + '\n');
};

console.warn = function(...args) {
    originalConsoleWarn.apply(console, args);
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
    originalConsoleWarn(clc.yellowBright(`[${getTimestamp()}] `) + clc.bgYellow.black(` WARN `) + ` ${msg}`);
    appLogStream.write(formatMessage('WARN', msg) + '\n');
};

module.exports = logger;
