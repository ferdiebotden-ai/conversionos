/**
 * Shared validation utilities — pure functions, no DB calls.
 * Used across quote editor, settings, intake, and chat components.
 */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^\+?[\d\s\-().]{10,}$/;
export const POSTAL_REGEX = /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/;
export const MAX_CHAT_LENGTH = 2000;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone.trim());
}

export function isValidCanadianPostal(postal: string): boolean {
  return POSTAL_REGEX.test(postal.trim());
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function isNonEmptyString(value: string, minLength = 1): boolean {
  return value.trim().length >= minLength;
}
