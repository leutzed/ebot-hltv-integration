const dotenv = require(`dotenv`);
const express = require(`express`);
const proxy = require(`express-http-proxy`);
const path = require(`path`);
const logger = require(`../logger`)(`Proxy Server`);

const app = express();
dotenv.config({ path: path.join(__dirname, `./.env`) });

app.use(`*`, proxy(process.env.PROXY_HOST, {
    proxyReqPathResolver: req => req.originalUrl
}));

app.listen(process.env.PROXY_PORT || 8080, () => {
    logger.info(`Listening port ${process.env.PROXY_PORT || 8080}`);
});