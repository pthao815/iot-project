const { validationResult } = require('express-validator');

// Runs after express-validator chains; returns 400 if any errors found
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

module.exports = validate;
