const express = require('express');
const validate = require('../../middleware/validate');
const { signupSchema } = require('../../validators/authValidator');
const { signup } = require('../../controllers/authController');

const router = express.Router();

router.post('/signup', validate(signupSchema), signup);

module.exports = router;
