const logger = require(`../src/logger`)(`Error Handler`);

process.on(`unhandledRejection`, error => logger.error(error));
process.on(`uncaughtException`, error => logger.error(error));