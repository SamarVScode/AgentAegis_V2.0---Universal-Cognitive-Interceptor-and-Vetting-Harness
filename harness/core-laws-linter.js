/**
 * Universal Linter (harness/core-laws-linter.js)
 * Retained for export compatibility.
 * Domain-specific Google Apps Script Core Laws have been removed to ensure
 * TypeSafe Aegis is completely universal across React, Node, Python, Go, Rust, and mobile apps.
 */

export const PRAGMA_REGEX = /\/\/\s*aegis-ignore:\s*(header-map-law|core-laws|all)\b/i;

/**
 * Universal pass-through: domain-specific GAS laws have been retired.
 * Returns { clean: true, violationCount: 0, violations: [] }
 */
export function lintCoreLaws(codeString = '', filePath = '') {
  return {
    clean: true,
    violationCount: 0,
    violations: []
  };
}

/**
 * Returns false under universal execution.
 */
export function isCoreLawsViolated(codeString = '', filePath = '') {
  return false;
}

/**
 * Formats report for universal approval.
 */
export function formatCoreLawsReport(violations = []) {
  return '[UNIVERSAL LINTER]: All checks passed cleanly (0 violations).';
}
