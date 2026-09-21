import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callJevSystemOne } from '../harness/jev-client.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const candidateCombos = {
  agent_aegis: 'AgentAegis (or Agent Aegis): Explicitly defines what it does: a protective cognitive shield for autonomous AI coding agents. Clean, intuitive, vendor-neutral.',
  pure_aegis: 'Aegis (or Aegis CLI / The Aegis Project): Minimalist, pure, highest prestige. No prefixes needed. CLI command is simply "aegis".',
  omni_aegis: 'OmniAegis: Reflects universality across all agent engines (Claude Code, Cursor, Antigravity, OpenCode). The all-protecting universal shield.',
  code_aegis: 'CodeAegis: Developer-first, emphasizes software engineering and code quality protection.',
  cogni_aegis: 'CogniAegis: Highlights cognitive interception, context bounding, and cycle breaking.'
};

try {
  const response = await callJevSystemOne({
    state: {
      naming_objective: 'Find the best brand-neutral name pairing with Aegis (excluding TypeSafe prefix) for a universal autonomous agent cognitive interceptor harness.',
      candidate_options: candidateCombos
    },
    questions: {
      best_aegis_brand_choice: {
        type: 'choice',
        instructions: 'Which non-brand Aegis pairing has the strongest developer prestige, immediate product clarity, and brand recall?',
        criteria: {
          agent_aegis: 'AgentAegis: Instantly communicates purpose to developers. It is an Aegis for AI Agents. Highly memorable and professional.',
          pure_aegis: 'Aegis (Standalone): Cleanest, highest prestige, zero clutter. Package name aegis or @aegis/core.',
          omni_aegis: 'OmniAegis: Emphasizes universal multi-engine compatibility (Claude, Cursor, Antigravity).',
          code_aegis: 'CodeAegis: Solid but slightly generic.',
          cogni_aegis: 'CogniAegis: Sounds academic.'
        }
      },
      cli_binary_name: {
        type: 'choice',
        instructions: 'What should the primary CLI binary command be in the terminal?',
        criteria: {
          aegis: 'aegis: Single word, 5 characters, effortless to type (npx aegis, aegis install).',
          agent_aegis: 'agent-aegis: Explicit two-word command.',
          omni_aegis: 'omniaegis: 9 characters.'
        }
      },
      definitive_recommendation: {
        type: 'choice',
        instructions: 'What is the definitive recommended product identity and tagline combination?',
        criteria: {
          agent_aegis_rec: 'AgentAegis — The Cognitive Interceptor & Vetting Harness for Autonomous Coding Agents (CLI: aegis)',
          pure_aegis_rec: 'Aegis — Universal Cognitive Interceptor for AI Coding Agents (CLI: aegis)',
          omni_aegis_rec: 'OmniAegis — Universal Interceptor & Shield for Multi-Engine Coding Agents'
        }
      }
    },
    timeoutMs: 60000
  });

  console.log('\n================================================================================');
  console.log('JEV AEGIS BRANDING ADJUDICATION RESULTS:');
  console.log('================================================================================\n');
  console.log(JSON.stringify(response, null, 2));

  fs.writeFileSync(
    path.join(rootDir, 'test', 'jev-aegis-combos-adjudication.json'),
    JSON.stringify(response, null, 2),
    'utf8'
  );
} catch (err) {
  console.error('Error contacting Jev:', err.message);
  process.exit(1);
}
