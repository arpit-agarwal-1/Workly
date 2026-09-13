const { env } = require('./env');

const JWT_ALGORITHM = 'HS256';
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const JWT_SECRET = env.JWT_SECRET;

if (typeof JWT_SECRET !== 'string' || JWT_SECRET.trim().length === 0) {
  throw new Error('JWT_SECRET is not configured.');
}

module.exports = {
  JWT_ALGORITHM,
  ACCESS_TOKEN_TTL_SECONDS,
  jwtConfig: {
    secret: JWT_SECRET,
    algorithm: JWT_ALGORITHM,
    accessTokenTTLSeconds: ACCESS_TOKEN_TTL_SECONDS,
  },
};
