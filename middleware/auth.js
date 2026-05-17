const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please login.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.userId, username: decoded.username, role: decoded.role };
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token. Please login again.' });
  }
}

module.exports = { authenticateToken };
