/**
 * TypeSafe Aegis (typesafe-aegis)
 * Universal Cognitive Interceptor & Vetting Middleware for Autonomous Coding Agents.
 * Mandated and calibrated by TypeSafe AI Jev (jev-1.13.0).
 */

export * from './harness/jev-client.js';
export * from './harness/manifest-sniffer.js';
export * from './harness/state-collector.js';
export * from './harness/diff-variance.js';
export * from './harness/core-laws-linter.js';
export * from './harness/cycle-detector.js';
export * from './harness/runner-parser.js';
export * from './harness/acceptance-gate.js';
export * from './harness/sensitive-guard.js';
export * from './harness/interceptor.js';
export * from './harness/install.js';

// Backward-compatible alias for callJevDecisions
import { callJevSystemOne } from './harness/jev-client.js';
export const callJevDecisions = callJevSystemOne;
