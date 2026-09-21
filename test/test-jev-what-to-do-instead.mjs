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
      document_ingestion_strategy: {
        type: 'choice',
        instructions: 'Instead of blocking file reads with SHA-256 (which causes context amnesia) or dumping all raw docs into the main coordinator (which compounds to millions of tokens), how should documentation, vaults, or multi-file specs be read?',
        criteria: {
          ephemeral_research_sandbox: 'Ephemeral Research Sandbox: Spawn a dedicated research subagent that reads the raw documents in an isolated context, synthesizes the core findings into a bounded summary artifact (<1,500 tokens), and terminates. The main coordinator reads only the summary artifact once, shielding the coordinator from 100k+ compounding raw tokens.',
          coordinator_raw_ingestion: 'Coordinator Raw Ingestion: Let the parent coordinator read all 20+ raw documents directly into its own context.',
          hardcoded_domain_parsers: 'Hardcoded Domain Parsers: Write custom hardcoded parsers for each document format (Obsidian, Notion, etc.).'
        }
      },
      code_reading_strategy: {
        type: 'choice',
        instructions: 'When an agent needs to inspect existing code files to make modifications, what is the optimal token-saving strategy instead of reading entire multi-thousand-line files or blocking reads?',
        criteria: {
          focal_chunking: 'Focal Chunking: Use targeted line ranges (StartLine/EndLine) or symbol search/grep to inspect only relevant functions or interfaces, rather than dumping entire multi-thousand-line files into context.',
          block_read_entirely: 'Block Read Entirely: Cache file content and reject view_file calls if file SHA-256 has not changed.',
          dump_entire_files: 'Dump Entire Files: Always read the entire file from line 1 to EOF regardless of file size.'
        }
      },
      interceptor_guidance_mechanism: {
        type: 'choice',
        instructions: 'What should the Aegis interceptor do if a coordinator agent starts sequentially reading dozens of documentation files in the main conversation?',
        criteria: {
          advise_subagent_delegation: 'Return an advisory guidance warning recommending the coordinator delegate bulk reading to an ephemeral research subagent to protect its context from token compounding.',
          hard_block_execution: 'Hard block the read and terminate the process with an error.',
          unconditional_pass: 'Allow unlimited sequential reading without any guidance.'
        }
      },
      holistic_token_solution: {
        type: 'choice',
        instructions: 'What is the optimal holistic architecture to achieve 70%+ token reduction while maintaining 100% zero-hallucination code quality?',
        criteria: {
          three_pillar_architecture: 'Three-Pillar Architecture: 1) Ephemeral research sandboxing for bulk documentation/specs; 2) Focal chunking for code inspection; 3) Supervisor anti-compounding throttle + SHA-256 history fingerprinting in state collector.',
          unconstrained_execution: 'Unconstrained execution without any harness or architectural constraints.'
        }
      }
    },
    timeoutMs: 60000
  });

  console.log('JEV INSTEAD ANALYSIS:');
  console.log(JSON.stringify(response, null, 2));
} catch (err) {
  console.error('Error contacting Jev:', err.message);
  process.exit(1);
}
