const REFRESH_TOKEN_COOKIE = 'refreshToken';
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

function getRefreshTokenCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/v1/auth/refresh',
    maxAge: REFRESH_TOKEN_MAX_AGE,
  };
}

function getRefreshTokenClearCookieOptions() {
  const { maxAge, ...options } = getRefreshTokenCookieOptions();
  return options;
}

function readCookieHeader(cookieHeader, cookieName) {
  if (typeof cookieHeader !== 'string' || typeof cookieName !== 'string') {
    return undefined;
  }

  const cookie = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`));
  if (!cookie) {
    return undefined;
  }

  try {
    return decodeURIComponent(cookie.slice(cookieName.length + 1));
  } catch (error) {
    return undefined;
  }
}

module.exports = {
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_MAX_AGE,
  getRefreshTokenCookieOptions,
  getRefreshTokenClearCookieOptions,
  readCookieHeader,
};