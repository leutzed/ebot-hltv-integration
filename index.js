const dotenv = require(`dotenv`);
const path = require(`path`);

const configPath = path.join(__dirname, `./.env`);
dotenv.config({ path: configPath });

require(`./src/data-collector`);
require(`./src/data-integrator`);