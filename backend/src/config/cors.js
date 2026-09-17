const { env } = require('./env');

const allowedOrigins = new Set([
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  env.CLIENT_URL,
].filter(Boolean));

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID','X-Organization-ID'],
};

module.exports = { corsOptions, allowedOrigins };
