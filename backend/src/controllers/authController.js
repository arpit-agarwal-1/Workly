const { signupUser } = require('../services/authService');

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

module.exports = {
  signup,
};
