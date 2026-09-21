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
  fullCodebase[f] = fs.readFileSync(path.join(rootDir, f), 'utf8');
}

try {
  const response = await callJevSystemOne({
    state: { complete_harness_source_code: fullCodebase },
    questions: {
      modality_universality: {
        type: 'choice',
        instructions: 'Does the Ephemeral Research Sandboxing architecture apply universally across Web Search, PDF documents, Markdown notes, and XLSX/CSV spreadsheets?',
        criteria: {
          universally_applicable: 'Universally applicable: The pattern isolates ANY high-volume ingestion (raw HTML from web searches, multi-page PDF text, raw spreadsheet tabular dumps, or markdown vaults) inside a disposable subagent context, returning only a compact, structured summary artifact (<1,500 tokens) to the coordinator.',
          text_only: 'Text only: It only works for markdown text files.',
          incompatible_with_multimodal: 'Incompatible with web search or spreadsheets.'
        }
      },
      token_leverage_on_heavy_modalities: {
        type: 'choice',
        instructions: 'How significant is the token protection when applying research sandboxing to Web Search (HTML scraping) and XLSX spreadsheets compared to raw coordinator ingestion?',
        criteria: {
          massive_token_protection: 'Massive (80%-95% savings): Web search HTML and raw spreadsheet rows carry immense token bloat. Sandboxing these ephemeral operations prevents megabytes of scraper noise and tabular data from permanently poisoning the coordinator history.',
          negligible_impact: 'Negligible impact.'
        }
      }
    },
    timeoutMs: 60000
  });

  console.log('JEV MODALITY UNIVERSALITY ANALYSIS:');
  console.log(JSON.stringify(response, null, 2));
} catch (err) {
  console.error('Error contacting Jev:', err.message);
  process.exit(1);
}
