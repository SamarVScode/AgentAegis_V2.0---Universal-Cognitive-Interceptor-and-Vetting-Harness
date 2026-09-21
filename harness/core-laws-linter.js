/**
 * Universal Code Invariants Linter (harness/core-laws-linter.js)
 * Static pattern linter enforcing universal code safety invariants:
 *   1. Prohibits unsafe dynamic evaluation (eval, new Function, vm.runInThisContext)
 *   2. Prohibits hardcoded private keys & plaintext cryptographic headers in source
 *   3. Prohibits direct prototype pollution (__proto__ assignment)
 * Universal across React, Node, Python, Go, Rust, and polyglot codebases.
 * Can be bypassed per-file with '// aegis-ignore: core-laws' or '// aegis-ignore: all'.
 */

export const PRAGMA_REGEX = /\/\/\s*aegis-ignore:\s*(core-laws|header-map-law|invariants|all)\b/i;

export const INVARIANT_RULES = [
  {
    id: 'UNSAFE_DYNAMIC_EVAL',
    description: 'Dynamic code execution (eval or new Function) introduces arbitrary code execution vulnerabilities.',
    pattern: /\b(eval\s*\(|new\s+Function\s*\(|vm\.runInThisContext\s*\()/i
  },
  {
    id: 'HARDCODED_PRIVATE_KEY',
    description: 'Hardcoded plaintext private key detected in source code.',
    pattern: /-----BEGIN\s+([A-Z0-9_-]+\s+)?PRIVATE\s+KEY-----/i
  },
  {
    id: 'PROTOTYPE_POLLUTION',
    description: 'Direct __proto__ assignment risks object prototype pollution.',
    pattern: /\b__proto__\s*=/i
  }
];

/**
 * Lints code string against universal safety invariants.
 */
export function lintCoreLaws(codeString = '', filePath = '') {
  const code = String(codeString || '');
  if (!code.trim() || PRAGMA_REGEX.test(code)) {
    return {
      clean: true,
      violationCount: 0,
      violations: []
    };
  }

  const lines = code.split(/\r?\n/);
  const violations = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('#')) return;

    for (const rule of INVARIANT_RULES) {
      if (rule.pattern.test(line)) {
        violations.push({
          ruleId: rule.id,
          line: index + 1,
          filePath: filePath || 'unknown',
          description: rule.description,
          sample: trimmed.slice(0, 100)
        });
      }
    }
  });

  return {
    clean: violations.length === 0,
    violationCount: violations.length,
    violations
  };
}

/**
 * Returns true if code contains un-pragmad universal invariant violations.
 */
export function isCoreLawsViolated(codeString = '', filePath = '') {
  return lintCoreLaws(codeString, filePath).violationCount > 0;
}

/**
 * Formats report for violations or clean status.
 */
export function formatCoreLawsReport(violations = []) {
  if (!violations || violations.length === 0) {
    return '[UNIVERSAL LINTER]: All checks passed cleanly (0 violations).';
  }
  const lines = violations.map(v => `  - [${v.ruleId}] Line ${v.line}: ${v.description} (File: ${v.filePath})`);
  return `[UNIVERSAL LINTER VETO]: Detected ${violations.length} code invariant violation(s):\n${lines.join('\n')}`;
}
