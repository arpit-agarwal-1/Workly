const { authenticateUser, signupUser, refreshUser, logoutUser } = require('../services/authService');
const {
  REFRESH_TOKEN_COOKIE,
  getRefreshTokenCookieOptions,
  getRefreshTokenClearCookieOptions,
  readCookieHeader,
} = require('../utils/authCookie');

async function signup(req, res, next) {
  try {
    const payload = req.body || {};
    const userAgent = req.get('user-agent') || undefined;
    const ipAddress = req.ip || undefined;

    const result = await signupUser({
      name: payload.name,
      email: payload.email,
      password: payload.password,
      organizationName: payload.organizationName,
      userAgent,
      ipAddress,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Account created successfully',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const payload = req.body || {};
    const result = await authenticateUser({
      email: payload.email,
      password: payload.password,
      userAgent: req.get('user-agent') || undefined,
      ipAddress: req.ip || undefined,
    });

    res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, getRefreshTokenCookieOptions());

    const { refreshToken, ...responseData } = result;
    return res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: responseData,
    });
  } catch (error) {
    return next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const refreshToken = readCookieHeader(req.get('cookie'), REFRESH_TOKEN_COOKIE);
    const result = await refreshUser({
      refreshToken,
      userAgent: req.get('user-agent') || undefined,
      ipAddress: req.ip || undefined,
    });

    res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, getRefreshTokenCookieOptions());

    return res.status(200).json({
      status: 'success',
      message: 'Token refreshed successfully',
      data: {
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function logout(req, res, next) {
  try {
    const refreshToken = readCookieHeader(req.get('cookie'), REFRESH_TOKEN_COOKIE);
    await logoutUser(refreshToken);
    res.clearCookie(REFRESH_TOKEN_COOKIE, getRefreshTokenClearCookieOptions());

    return res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  signup,
  login,
  refresh,
  logout,
};
