import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callJevSystemOne } from '../harness/jev-client.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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
  fullCodebase[f] = fs.readFileSync(path.join(rootDir, f), 'utf8');
}

const candidateNames = {
  aegis: 'TypeSafe Aegis (or simply Aegis / aegis CLI): The mythical impregnable shield of Athena/Zeus. Conveys total defensive containment, zero thrashing, and cognitive interception.',
  talos: 'TypeSafe Talos: The mythical bronze automaton guardian. Conveys autonomous vigilance, deterministic gating, and unbreakable boundary enforcement.',
  sentinel: 'TypeSafe Sentinel (or Jev Sentinel): Clear, enterprise, industrial. Conveys continuous active monitoring, lifecycle interceptor hooks, and cycle detection.',
  veritas: 'TypeSafe Veritas (or Veritas CLI): The Roman goddess of truth. Conveys the Lie Detector, empirical test gating, and zero-hallucination verification.',
  bastion: 'TypeSafe Bastion: A fortified defensive stronghold. Conveys token containment, research sandboxing, and protecting the developer from AI slop and runaway bills.'
};

try {
  const response = await callJevSystemOne({
    state: {
      repository_overview: {
        product: 'Cognitive Interceptor & Vetting Middleware for Autonomous Coding Agents',
        core_capabilities: [
          'PreTool & Stop lifecycle interceptors for Claude Code, Cursor, and Antigravity',
          'Dynamic multi-pattern cycle detector & diff variance breaker',
          'Lie Detector & deterministic test acceptance gate',
          'Universal Research Sandboxing & Focal Chunking (90%+ token reduction)',
          'Dual-layer fail-closed security against destructive operations'
        ],
        candidate_names: candidateNames
      }
    },
    questions: {
      best_name_choice: {
        type: 'choice',
        instructions: 'Which name has the highest developer prestige, brand clarity, and CLI usability (e.g. npx <name>, <name> install)?',
        criteria: {
          aegis: 'TypeSafe Aegis: The gold standard for protective interceptors. Clean, prestigious, already has high brand recognition, short CLI alias (aegis), and perfectly encapsulates the cognitive shield.',
          talos: 'TypeSafe Talos: Strong autonomous guardian imagery, distinct and punchy.',
          sentinel: 'TypeSafe Sentinel: Enterprise-grade and direct, but slightly generic.',
          veritas: 'TypeSafe Veritas: Emphasizes the Lie Detector and empirical truth, highly prestigious.',
          bastion: 'TypeSafe Bastion: Emphasizes security and cost containment.'
        }
      },
      cli_usability_rank: {
        type: 'choice',
        instructions: 'Which brand name creates the best developer experience for terminal commands (e.g. npx <name>, <name> run, <name> gate)?',
        criteria: {
          aegis_cli: 'aegis (npx aegis, aegis --all, aegis gate): 5 letters, single syllable/smooth pronunciation, elite reputation.',
          talos_cli: 'talos (npx talos, talos --all): 5 letters, robotic/mythic punch.',
          sentinel_cli: 'sentinel: 8 letters, slightly long for frequent terminal invocation.'
        }
      },
      positioning_subtitle: {
        type: 'choice',
        instructions: 'What is the most effective technical tagline/subtitle to accompany the chosen name on GitHub, npm, and docs?',
        criteria: {
          cognitive_interceptor: 'Universal Cognitive Interceptor & Vetting Harness for Autonomous Coding Agents',
          truth_and_token_gate: 'Deterministic Verification Gate & Token Optimizer for AI Developers',
          agent_shield: 'The Zero-Thrashing Armor for Claude Code, Cursor, and Antigravity'
        }
      }
    },
    timeoutMs: 60000
  });

  console.log('\n================================================================================');
  console.log('JEV NAMING ADJUDICATION RESULTS:');
  console.log('================================================================================\n');
  console.log(JSON.stringify(response, null, 2));

  fs.writeFileSync(
    path.join(rootDir, 'test', 'jev-naming-adjudication.json'),
    JSON.stringify(response, null, 2),
    'utf8'
  );
} catch (err) {
  console.error('Error contacting Jev:', err.message);
  process.exit(1);
}
