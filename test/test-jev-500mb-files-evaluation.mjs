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
    state: {
      repository: 'typesafe-aegis',
      source_files: fullCodebase
    },
    questions: {
      direct_llm_ingestion_of_500mb: {
        type: 'choice',
        instructions: 'Can any LLM directly ingest a 500MB+ file (XLSX, PDF, MD) into its context window?',
        criteria: {
          physically_impossible: 'Physically Impossible: 500MB represents 100M+ tokens, vastly exceeding the physical context limits of all existing LLMs (which max at 128k to 2M tokens). Attempting direct reading causes provider API rejection, tool truncation, or process OOM crash.',
          readily_supported: 'Readily supported by LLMs directly.'
        }
      },
      how_aegis_processes_500mb_files: {
        type: 'choice',
        instructions: 'How does the Aegis architecture correctly handle 500MB+ files without blowing context limits or failing?',
        criteria: {
          script_assisted_streaming_sandbox: 'Script-Assisted Streaming Sandbox: The ephemeral subagent runs local CPU scripts (e.g. Python pandas/duckdb for XLSX, pdfplumber/grep for PDF/MD) to stream, query, or chunk the 500MB file on disk, distilling only the target schema, statistics, or extracted text into a <1,500 token RESEARCH.md artifact.',
          raw_dump_to_chat: 'Dumping raw 500MB text into chat turns.'
        }
      },
      aegis_interceptor_containment: {
        type: 'choice',
        instructions: 'How do Aegis interceptor guardrails protect against accidental context blowout when huge files exist in the workspace?',
        criteria: {
          bounded_envelopes_and_sandboxing: 'Bounded Envelopes & Sandboxing: Universal Research Sandboxing prevents raw reading, state-collector hashes large arguments with SHA-256 (hashArgument) and caps git buffers at 10MB/50 lines, and diff envelopes remain strictly bounded.',
          no_protection: 'No protection.'
        }
      }
    },
    timeoutMs: 60000
  });

  console.log('JEV 500MB EVALUATION:');
  console.log(JSON.stringify(response, null, 2));

  fs.writeFileSync(
    path.join(rootDir, 'test', 'jev-500mb-evaluation.json'),
    JSON.stringify(response, null, 2),
    'utf8'
  );
} catch (err) {
  console.error('Error contacting Jev:', err.message);
  process.exit(1);
}
