const jwt = require('jsonwebtoken');

const signAccessToken = (payload) => {
  try {
    return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: process.env.ACCESS_EXP || '15m' });
  } catch (err) {
    throw new Error('Failed to sign access token');
  }
};

const signRefreshToken = (payload) => {
  try {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.REFRESH_EXP || '7d' });
  } catch (err) {
    throw new Error('Failed to sign refresh token');
  }
};

module.exports = { signAccessToken, signRefreshToken };
