import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = '24h';

/**
 * Generates a JWT token for a user.
 * @param {Object} payload - The user payload (id, role, etc)
 * @returns {string} - The signed JWT token
 */
export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: EXPIRES_IN });
};

/**
 * Verifies a JWT token.
 * @param {string} token - The token to verify
 * @returns {Object|null} - The decoded payload or null if invalid
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};
