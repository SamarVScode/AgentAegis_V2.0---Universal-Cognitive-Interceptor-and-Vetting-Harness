import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callJevSystemOne } from '../harness/jev-client.js';

const researchPath = 'C:\\Users\\User\\Desktop\\portfolio-aegis-live\\RESEARCH.md';
const researchContent = fs.readFileSync(researchPath, 'utf8');

try {
  const response = await callJevSystemOne({
    state: {
      research_artifact: researchContent
    },
    questions: {
      readiness_for_builder_subagent: {
        type: 'choice',
        instructions: 'Given this research document with real systems, metrics, and candidate profile, is it ready for the portfolio-architect subagent to construct the portfolio webpage?',
        criteria: {
          ready_for_subagent: 'Ready: The subagent has sufficient authentic data (7 distinct production systems, metrics, candidate profile) to generate HTML/CSS/JS and test suites.',
          needs_ui_spec: 'Needs UI Spec: The subagent should also receive a concrete UI layout specification (hero, stats grid, project cards with architecture diagrams, interactive tab filter, contact footer).',
          unusable: 'Unusable data.'
        }
      }
    },
    timeoutMs: 60000
  });

  console.log('JEV BUILDER READINESS:');
  console.log(JSON.stringify(response, null, 2));
} catch (err) {
  console.error('Error contacting Jev:', err.message);
  process.exit(1);
}
