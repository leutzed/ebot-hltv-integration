const { createLogger, format, transports } = require(`winston`);
const { combine, errors, timestamp, label, printf } = format; // eslint-disable-line object-curly-newline

module.exports = labelName => createLogger({
    level: `info`,
    handleExceptions: true,
    format: combine(
        timestamp({ format: `DD-MM-YYYY HH:mm:ss` }),
        errors({ stack: true }),
        label({ label: labelName }),
        printf(info => {
            if (info.stack) {
                return `[${info.timestamp}][${info.level.toUpperCase()}][${info.label}] ${info.stack}`;
            }

            return `[${info.timestamp}][${info.level.toUpperCase()}][${info.label}] ${info.message}`;
        })
    ),
    transports: [
        new transports.Console()
    ]
});