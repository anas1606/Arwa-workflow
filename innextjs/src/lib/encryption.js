import CryptoJS from 'crypto-js';

// Get the secret key from environment variables.
// NOTE: Make sure NEXT_PUBLIC_ENCRYPTION_SECRET is set in your .env file
// if you plan to use this on the client side (frontend).
const ENCRYPTION_SECRET = process.env.NEXT_PUBLIC_ENCRYPTION_SECRET || 'fallback_secret_do_not_use_in_prod';

/**
 * Encrypts a plain text string using AES.
 * @param {string} text - The plain text string (e.g., password)
 * @returns {string} - The encrypted cipher text
 */
export const encryptString = (text) => {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text, ENCRYPTION_SECRET).toString();
};

/**
 * Decrypts a cipher text string using AES.
 * @param {string} cipherText - The encrypted string
 * @returns {string} - The decrypted plain text
 */
export const decryptString = (cipherText) => {
  if (!cipherText) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, ENCRYPTION_SECRET);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) return cipherText; // Return original if empty (not valid AES)
    return decrypted;
  } catch (error) {
    // If it fails to decrypt (e.g., malformed UTF-8 because it was an unencrypted legacy string),
    // we simply return the raw string so it doesn't crash.
    return cipherText;
  }
};
