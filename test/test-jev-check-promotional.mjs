import fs from 'fs';
import { callJevSystemOne } from '../harness/jev-client.js';

const res = await callJevSystemOne({
  state: {
    readme: fs.readFileSync('README.md', 'utf8')
  },
  questions: {
    which_text_promotional: {
      type: 'choice',
      instructions: 'Which parts of the README still read as promotional rather than neutral engineering?',
      criteria: {
        architecture_table_claims: 'The Decoupled Decider-Actuator Architecture table (claims of Zero self-grading bias, etc.).',
        lie_detector_and_zero_overhead: 'Calling stage 1.5 "The Lie Detector" and claiming "zero-overhead".',
        benchmark_table: 'The empirical measurements table comparison with Without Harness.'
      }
    }
  }
});
console.log('Promotional diagnosis:', res.answers);
