import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callJevSystemOne } from '../harness/jev-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const allFiles = [
  'harness/interceptor.js',
  'harness/acceptance-gate.js',
  'harness/cycle-detector.js',
  'harness/sensitive-guard.js',
  'harness/diff-variance.js',
  'harness/runner-parser.js',
  'harness/manifest-sniffer.js',
  'harness/jev-client.js',
  'harness/install.js',
  'harness/state-collector.js',
  'harness/core-laws-linter.js',
  'harness/jev-vetter.js',
  'bin/cli.js',
  'index.js'
];

const fullCodebase = {};
for (const f of allFiles) {
  const raw = fs.readFileSync(path.join(rootDir, f), 'utf8');
  const cleaned = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/^\s*[\r\n]/gm, '');
  fullCodebase[f] = cleaned;
}

const res = await callJevSystemOne({
  state: {
    codebase: fullCodebase
  },
  questions: {
    which_component_broken: {
      type: 'choice',
      instructions: 'Which specific component or mechanism is causing the elevated risk / broken parts verdict?',
      criteria: {
        interceptor_fail_closed_mechanism: 'In interceptor.js, the way globalThis.__currentOperationDestructive is used or process.exit(0) in catch block.',
        acceptance_gate_execution: 'In acceptance-gate.js, execAsync test runner execution or timeout handling.',
        sensitive_guard_bypass: 'In sensitive-guard.js, path normalization or regex limitations.',
        cycle_detector_state: 'In cycle-detector.js, shadow buffer or session state file operations.',
        api_key_or_network_resilience: 'In jev-client.js, fetch error handling or timeout resilience.',
        installer_configuration: 'In install.js, configuration merge or hooks setup.'
      }
    },
    primary_security_concern: {
      type: 'choice',
      instructions: 'What is the primary security concern in the current codebase?',
      criteria: {
        uncaught_error_in_readStdinJson: 'If readStdinJson throws before globalThis.__currentOperationDestructive is set, the catch block still exits 0.',
        custom_command_execution: 'execAsync in acceptance gate still uses shell.',
        regex_bypass_in_commands: 'Complex obfuscated destructive commands (e.g. bash variables, encoded commands) can evade regex.',
        session_file_race_condition: 'Concurrent writes to .aegis-session file.'
      }
    }
  }
});

console.log('Jev Diagnostic Findings:');
console.log(JSON.stringify(res.answers, null, 2));
