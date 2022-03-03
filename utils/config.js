const dotenv = require(`dotenv`);
const path = require(`path`);

const envConfigPath = path.join(__dirname, `../.env`);

dotenv.config({ path: envConfigPath });