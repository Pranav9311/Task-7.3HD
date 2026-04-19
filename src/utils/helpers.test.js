import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  formatDate,
  truncateText,
  slugify,
  calculateReadingTime,
  capitalizeWords
} from './helpers';

// ====================================================================
// Unit Tests for Utility Helper Functions
// These tests cover all utility functions used across the Deakin app.
// ====================================================================

describe('validateEmail', () => {
  it('should return true for valid email addresses', () => {
    expect(validateEmail('user@deakin.edu.au')).toBe(true);
    expect(validateEmail('john.doe@example.com')).toBe(true);
    expect(validateEmail('test+label@mail.co')).toBe(true);
  });

  it('should return false for invalid email addresses', () => {
    expect(validateEmail('')).toBe(false);
    expect(validateEmail('notanemail')).toBe(false);
    expect(validateEmail('@missing.user')).toBe(false);
    expect(validateEmail('missing@.domain')).toBe(false);
    expect(validateEmail('spaces in@email.com')).toBe(false);
  });

  it('should handle null and undefined inputs', () => {
    expect(validateEmail(null)).toBe(false);
    expect(validateEmail(undefined)).toBe(false);
    expect(validateEmail(123)).toBe(false);
  });

  it('should trim whitespace from emails', () => {
    expect(validateEmail('  user@deakin.edu.au  ')).toBe(true);
  });
});

describe('validatePassword', () => {
  it('should accept strong passwords', () => {
    const result = validatePassword('SecurePass1');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject passwords shorter than 8 characters', () => {
    const result = validatePassword('Sh0rt');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must be at least 8 characters');
  });

  it('should require uppercase letters', () => {
    const result = validatePassword('lowercase1');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain an uppercase letter');
  });

  it('should require lowercase letters', () => {
    const result = validatePassword('UPPERCASE1');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain a lowercase letter');
  });

  it('should require numbers', () => {
    const result = validatePassword('NoNumbers!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain a number');
  });

  it('should return multiple errors for very weak passwords', () => {
    const result = validatePassword('abc');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });

  it('should handle empty and null inputs', () => {
    expect(validatePassword('').valid).toBe(false);
    expect(validatePassword(null).valid).toBe(false);
    expect(validatePassword(undefined).valid).toBe(false);
  });
});

describe('formatDate', () => {
  it('should format a valid date string', () => {
    const result = formatDate('2025-01-15');
    expect(result).toBeTruthy();
    expect(result).toContain('2025');
  });

  it('should format a Date object', () => {
    const result = formatDate(new Date('2025-06-20'));
    expect(result).toBeTruthy();
    expect(result).toContain('2025');
  });

  it('should return empty string for invalid dates', () => {
    expect(formatDate('not-a-date')).toBe('');
    expect(formatDate('')).toBe('');
    expect(formatDate(null)).toBe('');
  });
});

describe('truncateText', () => {
  it('should not truncate short text', () => {
    expect(truncateText('Hello', 10)).toBe('Hello');
  });

  it('should truncate long text with ellipsis', () => {
    const longText = 'This is a very long piece of text that should be truncated';
    const result = truncateText(longText, 20);
    expect(result.length).toBeLessThanOrEqual(23); // 20 + '...'
    expect(result).toContain('...');
  });

  it('should use default maxLength of 100', () => {
    const text = 'A'.repeat(150);
    const result = truncateText(text);
    expect(result).toContain('...');
    expect(result.length).toBeLessThanOrEqual(103);
  });

  it('should handle empty and null inputs', () => {
    expect(truncateText('')).toBe('');
    expect(truncateText(null)).toBe('');
    expect(truncateText(undefined)).toBe('');
  });
});

describe('slugify', () => {
  it('should convert text to URL-friendly slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
    expect(slugify('Introduction to React')).toBe('introduction-to-react');
  });

  it('should remove special characters', () => {
    expect(slugify('Hello! World?')).toBe('hello-world');
    expect(slugify('Test@#$String')).toBe('teststring');
  });

  it('should handle multiple spaces and dashes', () => {
    expect(slugify('  multiple   spaces  ')).toBe('multiple-spaces');
    expect(slugify('--leading-trailing--')).toBe('leading-trailing');
  });

  it('should handle empty inputs', () => {
    expect(slugify('')).toBe('');
    expect(slugify(null)).toBe('');
  });
});

describe('calculateReadingTime', () => {
  it('should return 1 minute for short texts', () => {
    expect(calculateReadingTime('A short sentence.')).toBe(1);
  });

  it('should calculate correctly for longer texts', () => {
    const words = Array(400).fill('word').join(' ');
    expect(calculateReadingTime(words)).toBe(2);
  });

  it('should return 0 for empty inputs', () => {
    expect(calculateReadingTime('')).toBe(0);
    expect(calculateReadingTime(null)).toBe(0);
  });
});

describe('capitalizeWords', () => {
  it('should capitalize first letter of each word', () => {
    expect(capitalizeWords('hello world')).toBe('Hello World');
    expect(capitalizeWords('deakin university')).toBe('Deakin University');
  });

  it('should handle single words', () => {
    expect(capitalizeWords('test')).toBe('Test');
  });

  it('should handle empty inputs', () => {
    expect(capitalizeWords('')).toBe('');
    expect(capitalizeWords(null)).toBe('');
  });
});

// ====================================================================
// Integration-style Tests
// These tests verify that multiple utility functions work together.
// ====================================================================

describe('Integration Tests - Multiple Utilities', () => {
  it('should validate email and format user display name', () => {
    const email = 'john.doe@deakin.edu.au';
    const name = 'john doe';
    
    expect(validateEmail(email)).toBe(true);
    expect(capitalizeWords(name)).toBe('John Doe');
  });

  it('should validate password and slugify a page title', () => {
    const password = 'SecurePass123';
    const pageTitle = 'My Course Dashboard';
    
    const passwordResult = validatePassword(password);
    expect(passwordResult.valid).toBe(true);
    expect(slugify(pageTitle)).toBe('my-course-dashboard');
  });

  it('should truncate a news article and calculate reading time', () => {
    const article = Array(500).fill('word').join(' ');
    const preview = truncateText(article, 50);
    const readTime = calculateReadingTime(article);
    
    expect(preview).toContain('...');
    expect(readTime).toBe(3);
  });
});
