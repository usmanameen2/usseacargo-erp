const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

/**
 * JWT Authentication Middleware
 * Verifies Bearer token from Authorization header
 * Attaches decoded user info to req.user
 */
function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        data: null
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token.',
          data: null
        });
      }

      // Attach user info to request
      req.user = {
        id: decoded.userId,
        username: decoded.username,
        role: decoded.role
      };

      next();
    });
  } catch (error) {
    console.error('[Auth Middleware] Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Authentication error.',
      data: null
    });
  }
}

module.exports = authMiddleware;
