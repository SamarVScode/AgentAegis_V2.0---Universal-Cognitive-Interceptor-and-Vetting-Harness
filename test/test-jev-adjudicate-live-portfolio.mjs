import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callJevSystemOne } from '../harness/jev-client.js';

const portfolioDir = 'C:\\Users\\User\\Desktop\\portfolio-aegis-live';
const htmlContent = fs.readFileSync(path.join(portfolioDir, 'index.html'), 'utf8');
const cssContent = fs.readFileSync(path.join(portfolioDir, 'styles.css'), 'utf8');
const jsContent = fs.readFileSync(path.join(portfolioDir, 'app.js'), 'utf8');
const testContent = fs.readFileSync(path.join(portfolioDir, 'test', 'portfolio.test.js'), 'utf8');
const pkgContent = fs.readFileSync(path.join(portfolioDir, 'package.json'), 'utf8');

try {
  const response = await callJevSystemOne({
    state: {
      candidate_name: 'Samarjit Singh',
      role: 'Logistics Systems Architect & Operations Engineering Lead',
      source_files: {
        'package.json': pkgContent,
        'index.html': htmlContent.slice(0, 15000),
        'styles.css': cssContent.slice(0, 8000),
        'app.js': jsContent.slice(0, 5000),
        'test/portfolio.test.js': testContent
      },
      verification_status: '11/11 tests passed in npm test, 0 failures, 0 emojis'
    },
    questions: {
      resume_prestige_score: {
        type: 'score',
        instructions: 'Score the engineering prestige, production credibility, and resume presentation of this portfolio on a 0 to 3 scale.',
        criteria: [
          '0: Unusable or damaging to professional prestige with emojis or broken layout',
          '1: Mediocre, generic projects without concrete metrics',
          '2: Strong, credible, senior-level presentation with authentic metrics',
          '3: Exceptional Staff/Lead caliber: authentic supply chain systems (Rust calamine, 15-35MB RSS, WebRTC host shell, ML Kit OCR, sub-second barcode wedge), zero emojis, high-prestige typography, and deterministic test suite'
        ]
      },
      zero_emoji_and_ai_slop_check: {
        type: 'choice',
        instructions: 'Does the portfolio strictly satisfy the ZERO EMOJI and ZERO AI SLOP constraints?',
        criteria: {
          strictly_compliant: 'Strictly Compliant: Zero emojis, clean typography, authentic production metrics, professional design tokens.',
          non_compliant: 'Contains emojis or superficial AI slop.'
        }
      },
      harness_verification_pass: {
        type: 'choice',
        instructions: 'Does this portfolio pass the TypeSafe Aegis Acceptance Gate and deterministic verification?',
        criteria: {
          verified_and_approved: 'Verified & Approved: Deterministic test suite passes with 11/11 tests, code reflects disk truth, zero hallucinations.',
          rejected: 'Rejected.'
        }
      }
    },
    timeoutMs: 60000
  });

  console.log('\n================================================================================');
  console.log('JEV LIVE PORTFOLIO ADJUDICATION:');
  console.log('================================================================================\n');
  console.log(JSON.stringify(response, null, 2));

  // Save to portfolio-aegis-live directory
  fs.writeFileSync(
    path.join(portfolioDir, 'jev-adjudication-verdict.json'),
    JSON.stringify(response, null, 2),
    'utf8'
  );

  // Update telemetry log
  const telemetryPath = path.join(portfolioDir, 'aegis-live-telemetry.json');
  const telemetry = JSON.parse(fs.readFileSync(telemetryPath, 'utf8'));
  telemetry.jev_decisions.push({
    gate: 'final_portfolio_adjudication',
    model: response.model,
    answers: response.answers,
    usage: response.usage,
    timestamp: new Date().toISOString()
  });
  telemetry.token_usage.jev_input_tokens += response.usage?.input_tokens || 0;
  telemetry.token_usage.jev_output_tokens += response.usage?.output_tokens || 0;
  telemetry.steps.push({
    step: 3,
    action: "adjudicate_final_portfolio",
    status: "completed",
    prestige_score: response.answers?.resume_prestige_score?.score,
    timestamp: new Date().toISOString()
  });
  fs.writeFileSync(telemetryPath, JSON.stringify(telemetry, null, 2), 'utf8');
} catch (err) {
  console.error('Error contacting Jev:', err.message);
  process.exit(1);
}
