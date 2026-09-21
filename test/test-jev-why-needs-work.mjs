import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callJevSystemOne } from '../harness/jev-client.js';

const researchPath = 'C:\\Users\\User\\Desktop\\portfolio-aegis-live\\RESEARCH.md';
const researchContent = fs.readFileSync(researchPath, 'utf8');

try {
  const response = await callJevSystemOne({
    state: {
      task: 'Investigate what is needed for portfolio build approval',
      research_artifact: researchContent
    },
    questions: {
      what_is_missing: {
        type: 'choice',
        instructions: 'What specific detail or structure is missing before building the portfolio?',
        criteria: {
          missing_candidate_profile_and_contact: 'Candidate Profile & Structure: RESEARCH.md currently only lists technical backend projects; it lacks candidate name/title, career summary, GitHub/LinkedIn contact placeholders, and specific UI section mapping for the portfolio page.',
          technical_inaccuracy: 'Technical Inaccuracy: The project descriptions are wrong.',
          format_issue: 'Format Issue: The file format is unreadable.'
        }
      },
      how_to_resolve: {
        type: 'choice',
        instructions: 'How should this be resolved for the portfolio build?',
        criteria: {
          supplement_candidate_profile: 'Supplement Candidate Profile: Add a Candidate Profile section (Senior Systems & Logistics Software Engineer, Skills Matrix, Contact/Resume Header) to RESEARCH.md before building the UI.',
          scrap_research: 'Scrap the research and start over.'
        }
      }
    },
    timeoutMs: 60000
  });

  console.log('JEV MISSING ANALYSIS:');
  console.log(JSON.stringify(response, null, 2));
} catch (err) {
  console.error('Error contacting Jev:', err.message);
  process.exit(1);
}
