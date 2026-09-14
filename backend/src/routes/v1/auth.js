const express = require('express');
const validate = require('../../middleware/validate');
const { loginSchema, signupSchema } = require('../../validators/authValidator');
const { login, logout, refresh, signup } = require('../../controllers/authController');

const router = express.Router();

router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', logout);

module.exports = router;
