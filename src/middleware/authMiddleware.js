const jwt = require('jsonwebtoken');

function authenticateAccessToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') && authHeader.split(' ')[1];

  if (!token) {
    console.log(`❌ [AUTH] Missing token - IP: ${req.ip}, Path: ${req.path}`);
    return res.status(401).json({ message: 'Missing token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      console.log(`❌ [AUTH] Token expired - Path: ${req.path}`);
      return res.status(401).json({ message: 'Token expired' });
    }
    console.log(`❌ [AUTH] Invalid token - Path: ${req.path}`);
    return res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = { authenticateAccessToken };
