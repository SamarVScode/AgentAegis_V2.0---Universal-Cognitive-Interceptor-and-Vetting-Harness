import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callJevSystemOne } from '../harness/jev-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const researchPath = 'C:\\Users\\User\\Desktop\\portfolio-aegis-live\\RESEARCH.md';
const researchContent = fs.readFileSync(researchPath, 'utf8');

try {
  const response = await callJevSystemOne({
    state: {
      task: 'Verify Research Synthesis for Technical Portfolio',
      research_artifact: researchContent
    },
    questions: {
      research_prestige_quality: {
        type: 'choice',
        instructions: 'Evaluate the technical depth, prestige, and authenticity of the synthesized research artifact for an elite engineering portfolio.',
        criteria: {
          exceptional_engineering_depth: 'Exceptional: Concrete architectural metrics (Rust calamine, 15-35MB RSS, WebRTC inverse proxy shell, Kotlin ML Kit OCR, sub-second barcode wedge), authentic problem statements, zero emojis, and zero AI fluff.',
          superficial_slop: 'Superficial AI slop: Generic buzzwords without real architectural depth.'
        }
      },
      approve_for_portfolio_build: {
        type: 'choice',
        instructions: 'Do you approve using this research document as the single source of truth for the portfolio builder subagent?',
        criteria: {
          approved: 'Approved: Proceed to build high-prestige portfolio.',
          reject_needs_more_work: 'Reject: Needs revision.'
        }
      }
    },
    timeoutMs: 60000
  });

  console.log('JEV RESEARCH VERIFICATION:');
  console.log(JSON.stringify(response, null, 2));

  // Update telemetry in target workspace
  const telemetryPath = 'C:\\Users\\User\\Desktop\\portfolio-aegis-live\\aegis-live-telemetry.json';
  const telemetry = JSON.parse(fs.readFileSync(telemetryPath, 'utf8'));
  telemetry.jev_decisions.push({
    gate: 'research_validation',
    model: response.model,
    answers: response.answers,
    usage: response.usage,
    timestamp: new Date().toISOString()
  });
  telemetry.token_usage.jev_input_tokens += response.usage?.input_tokens || 0;
  telemetry.token_usage.jev_output_tokens += response.usage?.output_tokens || 0;
  fs.writeFileSync(telemetryPath, JSON.stringify(telemetry, null, 2), 'utf8');
} catch (err) {
  console.error('Error contacting Jev:', err.message);
  process.exit(1);
}
