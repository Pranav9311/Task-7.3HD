/**
 * Utility helper functions for the Deakin Learning App.
 * These functions handle common data transformations and validation
 * used throughout the application.
 */

/**
 * Validates an email address format.
 * @param {string} email - The email to validate.
 * @returns {boolean} True if the email format is valid.
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates password strength.
 * Requirements: minimum 8 characters, at least one uppercase,
 * one lowercase, one number.
 * @param {string} password - The password to validate.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePassword(password) {
  const errors = [];
  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }
  if (password.length < 8) errors.push('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain an uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Password must contain a lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Password must contain a number');
  return { valid: errors.length === 0, errors };
}

/**
 * Formats a date string to a human-readable format.
 * @param {string|Date} dateInput - The date to format.
 * @param {string} locale - The locale string (default 'en-AU').
 * @returns {string} The formatted date string.
 */
export function formatDate(dateInput, locale = 'en-AU') {
  if (!dateInput) return '';
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return '';
  }
}

/**
 * Truncates text to a specified maximum length with ellipsis.
 * @param {string} text - The text to truncate.
 * @param {number} maxLength - Maximum character length (default 100).
 * @returns {string} The truncated text.
 */
export function truncateText(text, maxLength = 100) {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '...';
}

/**
 * Generates a URL-friendly slug from a string.
 * @param {string} str - The string to slugify.
 * @returns {string} The slugified string.
 */
export function slugify(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Calculates reading time estimate for a given text.
 * Based on average reading speed of 200 words per minute.
 * @param {string} text - The text content.
 * @returns {number} Estimated reading time in minutes.
 */
export function calculateReadingTime(text) {
  if (!text || typeof text !== 'string') return 0;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/**
 * Debounce function utility.
 * @param {Function} func - The function to debounce.
 * @param {number} delay - Delay in milliseconds.
 * @returns {Function} The debounced function.
 */
export function debounce(func, delay = 300) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Capitalizes the first letter of each word in a string.
 * @param {string} str - The string to capitalize.
 * @returns {string} The capitalized string.
 */
export function capitalizeWords(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}
