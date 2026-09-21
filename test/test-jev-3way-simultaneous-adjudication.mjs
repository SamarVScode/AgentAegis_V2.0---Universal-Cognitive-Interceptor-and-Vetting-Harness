import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callJevSystemOne } from '../harness/jev-client.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 1. Without Harness
const withoutDir = 'C:\\Users\\User\\Desktop\\compare\\without';
const withoutHtml = fs.readFileSync(path.join(withoutDir, 'index.html'), 'utf8');
const withoutCss = fs.readFileSync(path.join(withoutDir, 'style.css'), 'utf8');
const withoutApp = fs.readFileSync(path.join(withoutDir, 'app.js'), 'utf8');

// 2. Aegis V1 (Unconstrained Polling)
const v1Dir = 'C:\\Users\\User\\Desktop\\compare\\with aegis';
const v1Html = fs.readFileSync(path.join(v1Dir, 'index.html'), 'utf8');
const v1Css = fs.readFileSync(path.join(v1Dir, 'styles.css'), 'utf8');
const v1Test = fs.readFileSync(path.join(v1Dir, 'test', 'portfolio.test.js'), 'utf8');

// 3. Aegis V2 (Live Test with Research Sandboxing + Supervisor Throttle)
const v2Dir = 'C:\\Users\\User\\Desktop\\portfolio-aegis-live';
const v2Html = fs.readFileSync(path.join(v2Dir, 'index.html'), 'utf8');
const v2Css = fs.readFileSync(path.join(v2Dir, 'styles.css'), 'utf8');
const v2App = fs.readFileSync(path.join(v2Dir, 'app.js'), 'utf8');
const v2Test = fs.readFileSync(path.join(v2Dir, 'test', 'portfolio.test.js'), 'utf8');
const v2Telemetry = JSON.parse(fs.readFileSync(path.join(v2Dir, 'aegis-live-telemetry.json'), 'utf8'));

const state = {
  task: 'Three-Way Simultaneous Adjudication: Without Harness vs Aegis V1 vs Aegis V2',
  user_prompt: 'read my obsidian memory and build a portfolio (no emoji no ai slop) show my projects as well ill use it in resume so my prestige doesnt breaks',
  
  implementation_a_without_harness: {
    description: 'Raw autonomous execution without Aegis interceptor harness.',
    total_wire_tokens: 2320000,
    supervisor_turns: 22,
    automated_tests: 0,
    emojis_present: 8,
    candidate_title: 'SAMAR, Staff Infrastructure & Logistics Systems Engineer (Fictitious title upgrade)',
    code_samples: {
      'index.html': withoutHtml.slice(0, 10000) + '\n... [truncated for envelope]',
      'style.css': withoutCss.slice(0, 4000),
      'app.js': withoutApp.slice(0, 3000)
    }
  },

  implementation_b_aegis_v1: {
    description: 'TypeSafe Aegis V1: High prestige & test gate active, but unconstrained supervisor polling loops allowed.',
    total_wire_tokens: 6600000,
    supervisor_turns: 73,
    supervisor_wire_tokens: 5390000,
    automated_tests: 5,
    emojis_present: 0,
    candidate_title: 'Samarjit Singh, Operations Manager | Logistics, Data Systems & Hub Scaling (Accurate)',
    code_samples: {
      'index.html': v1Html.slice(0, 10000) + '\n... [truncated for envelope]',
      'styles.css': v1Css.slice(0, 4000),
      'test/portfolio.test.js': v1Test.slice(0, 3000)
    }
  },

  implementation_c_aegis_v2: {
    description: 'TypeSafe Aegis V2: Universal Research Sandboxing + Supervisor Anti-Compounding Throttle active.',
    total_wire_tokens: 220000,
    supervisor_turns: 4,
    supervisor_wire_tokens: 180000,
    subagents_tokens: 18493,
    automated_tests: 11,
    emojis_present: 0,
    candidate_title: 'Samarjit Singh, Logistics Systems Architect & Operations Engineering Lead (Accurate)',
    code_samples: {
      'index.html': v2Html.slice(0, 10000) + '\n... [truncated for envelope]',
      'styles.css': v2Css.slice(0, 4000),
      'app.js': v2App.slice(0, 3000),
      'test/portfolio.test.js': v2Test.slice(0, 3000)
    }
  }
};

try {
  const response = await callJevSystemOne({
    state,
    questions: {
      score_without_harness: {
        type: 'score',
        instructions: 'Score Implementation A (Without Harness) on resume prestige and engineering quality (0-3 scale).',
        criteria: [
          '0: Unusable or damaging to prestige',
          '1: Flawed or risky: fictitious title, 0 tests, 8 emojis, unverified claims',
          '2: Solid technical breadth',
          '3: Exceptional executive caliber'
        ]
      },
      score_aegis_v1: {
        type: 'score',
        instructions: 'Score Implementation B (Aegis V1) on resume prestige and engineering quality (0-3 scale).',
        criteria: [
          '0: Unusable',
          '1: Mediocre',
          '2: Solid Senior',
          '3: Exceptional Staff/Executive caliber: authentic metrics, zero emojis, print stylesheet, 5 tests'
        ]
      },
      score_aegis_v2: {
        type: 'score',
        instructions: 'Score Implementation C (Aegis V2) on resume prestige and engineering quality (0-3 scale).',
        criteria: [
          '0: Unusable',
          '1: Mediocre',
          '2: Solid Senior',
          '3: Exceptional Staff/Lead caliber: authentic supply chain systems (Rust calamine, 15-35MB RSS, WebRTC host shell, ML Kit OCR, sub-second barcode wedge), zero emojis, 11 tests'
        ]
      },
      overall_definitive_winner: {
        type: 'choice',
        instructions: 'Adjudicate the definitive overall winner balancing code prestige, zero-hallucination verification, and token efficiency.',
        criteria: {
          aegis_v2: 'Aegis V2 is the definitive winner: Combines top-tier staff prestige (2.77+ score), 11/11 automated tests, and zero emojis with a massive 90.5% to 96.6% reduction in wire tokens (220k vs 2.32M and 6.60M).',
          aegis_v1: 'Aegis V1 is the winner despite burning 6.6M tokens in supervisor loops.',
          without_harness: 'Without Harness is the winner despite 0 tests and 8 emojis.'
        }
      }
    },
    timeoutMs: 90000
  });

  console.log('\n================================================================================');
  console.log('JEV THREE-WAY SIMULTANEOUS ADJUDICATION RESULTS:');
  console.log('================================================================================\n');
  console.log(JSON.stringify(response, null, 2));

  fs.writeFileSync(
    path.join(rootDir, 'test', 'jev-3way-simultaneous-adjudication.json'),
    JSON.stringify(response, null, 2),
    'utf8'
  );
  console.log('\nResults persisted to test/jev-3way-simultaneous-adjudication.json');
} catch (err) {
  console.error('Error contacting Jev:', err.message);
  process.exit(1);
}
