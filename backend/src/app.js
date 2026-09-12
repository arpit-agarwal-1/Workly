const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { corsOptions } = require('./config/cors');
const apiRoutes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const requestIdMiddleware = require('./middleware/requestId');
const { generalLimiter } = require('./middleware/rateLimiter');

const app = express();

app.use(requestIdMiddleware);
app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(generalLimiter);

app.use('/api', apiRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
