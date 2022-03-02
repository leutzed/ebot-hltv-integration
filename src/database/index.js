const mysql = require(`mysql2/promise`);
const logger = require(`../logger`)(`Database`);

const {
    MYSQL_HOST,
    MYSQL_PORT,
    MYSQL_USER,
    MYSQL_PASSWORD,
    MYSQL_DATABASE
} = process.env;

const client = mysql.createPool({
    host: MYSQL_HOST,
    port: MYSQL_PORT,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE
});

(async () => {
    try {
        await client.query(`SELECT 1 + 1 as \`result\``);
        logger.info(`Connected to ${MYSQL_HOST}:${MYSQL_PORT} as ${MYSQL_USER}`);
    } catch(error) {
        logger.warn(error);
    }
})();

module.exports = client;