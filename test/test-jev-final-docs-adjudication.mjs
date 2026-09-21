import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callJevSystemOne } from '../harness/jev-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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

console.log('Loading full 14-file codebase into context...');
const fullCodebase = {};
let totalChars = 0;
for (const f of allFiles) {
  const fullPath = path.join(rootDir, f);
  if (fs.existsSync(fullPath)) {
    const raw = fs.readFileSync(fullPath, 'utf8');
    const cleaned = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*\r?\n/gm, '').replace(/^\s*[\r\n]/gm, '');
    fullCodebase[f] = cleaned;
    totalChars += cleaned.length;
  }
}

const readmeContent = fs.readFileSync(path.join(rootDir, 'README.md'), 'utf8');
const htmlContent = fs.readFileSync(path.join(rootDir, 'walkthrough', 'index.html'), 'utf8');

console.log(`Loaded 14 codebase files (${totalChars} chars) + README.md (${readmeContent.length} chars) + index.html (${htmlContent.length} chars).`);

const adjudicationQuestions = {
  readme_factual_accuracy: {
    type: 'noul',
    instructions: 'Does README.md factually and accurately describe the AgentAegis V2.0 codebase implementation (Decoupled Decider-Actuator pattern, stdin session_id slot-2 priority, 3-stage acceptance gate with Stage 1.5 disk claim reconciliation, bipartite fail-safe matrix, and Windows safeSpawnAsync) without introducing contradictory or unverified claims?',
    criteria: {
      true: 'README.md accurately reflects the technical implementation in the 14 codebase files with zero promotional falsehoods.',
      false: 'README.md contradicts the codebase or makes unverified claims.'
    }
  },
  html_walkthrough_accuracy: {
    type: 'noul',
    instructions: 'Does walkthrough/index.html accurately present the 4-stage cognitive interceptor lifecycle, 3-way empirical benchmark data, token physics compounding slider, and multi-engine quickstart for Claude Code, Cursor, and Antigravity with zero emojis?',
    criteria: {
      true: 'walkthrough/index.html correctly presents the architectural stages, empirical metrics, and quickstart commands.',
      false: 'The HTML contains inaccurate claims, non-functional flows, or violates the zero emoji rule.'
    }
  },
  advisory_security_honesty: {
    type: 'noul',
    instructions: 'Do both README.md and walkthrough/index.html honestly and transparently bound their security model as application-level cognitive lifecycle defense-in-depth, explicitly stating that hostile untrusted binary execution requires container isolation (Docker/eBPF)?',
    criteria: {
      true: 'The documentation is technically honest and clearly scopes the boundary between application hooks and OS sandboxing.',
      false: 'The documentation misleads users by claiming to be an impenetrable sandbox for arbitrary hostile binaries.'
    }
  },
  documentation_technical_prestige_score: {
    type: 'score',
    instructions: 'Score the overall technical rigor, precision, readability, and systems engineering quality of the finalized README.md and walkthrough HTML on a 0.00 to 3.00 scale.',
    criteria: [
      '0: Vague, generic marketing fluff with inaccurate claims',
      '1: Basic documentation with missing architecture specifications',
      '2: High-prestige, precise systems engineering documentation with verified code invariants and empirical telemetry',
      '3: Flawless executive-grade open-source documentation standard'
    ]
  },
  final_documentation_deployment_verdict: {
    type: 'choice',
    instructions: 'What is the final adjudication verdict on the updated README.md and walkthrough HTML for public developer release?',
    criteria: {
      approved_for_public_release: 'Approved for Public Release: Documentation is technically verified against the codebase, rigorous, and accurate.',
      needs_further_refinement: 'Needs Further Work: Factual errors or promotional exaggerations remain.'
    }
  }
};

async function runDocsAdjudication() {
  console.log('\n======================================================');
  console.log('STARTING JEV SYSTEM ONE ADJUDICATION OF MD & HTML');
  console.log('Running 2 structured evaluations with codebase context');
  console.log('======================================================\n');

  try {
    // Evaluation 1: README.md accuracy and architectural honesty against core harness files
    console.log('Running Evaluation 1: README.md Technical Accuracy & Security Scoping...');
    const res1 = await callJevSystemOne({
      state: {
        assessment: 'readme_architecture_and_security_adjudication',
        core_codebase: {
          'harness/interceptor.js': fullCodebase['harness/interceptor.js'],
          'harness/acceptance-gate.js': fullCodebase['harness/acceptance-gate.js'],
          'harness/cycle-detector.js': fullCodebase['harness/cycle-detector.js'],
          'harness/jev-client.js': fullCodebase['harness/jev-client.js'],
          'harness/sensitive-guard.js': fullCodebase['harness/sensitive-guard.js'],
          'harness/state-collector.js': fullCodebase['harness/state-collector.js'],
          'harness/manifest-sniffer.js': fullCodebase['harness/manifest-sniffer.js']
        },
        readme_content: readmeContent
      },
      questions: {
        readme_factual_accuracy: adjudicationQuestions.readme_factual_accuracy,
        advisory_security_honesty: adjudicationQuestions.advisory_security_honesty
      },
      timeoutMs: 120000
    });

    console.log('Evaluation 1 completed. Running Evaluation 2: HTML Walkthrough, Prestige Score, and Release Verdict...');
    // Evaluation 2: Walkthrough HTML accuracy, CLI reference, and final prestige score
    const res2 = await callJevSystemOne({
      state: {
        assessment: 'html_showcase_and_release_readiness_adjudication',
        cli_and_integration_codebase: {
          'bin/cli.js': fullCodebase['bin/cli.js'],
          'harness/install.js': fullCodebase['harness/install.js'],
          'harness/diff-variance.js': fullCodebase['harness/diff-variance.js'],
          'harness/runner-parser.js': fullCodebase['harness/runner-parser.js'],
          'harness/core-laws-linter.js': fullCodebase['harness/core-laws-linter.js'],
          'harness/jev-vetter.js': fullCodebase['harness/jev-vetter.js'],
          'index.js': fullCodebase['index.js']
        },
        html_content: htmlContent,
        readme_summary: readmeContent.slice(0, 8000)
      },
      questions: {
        html_walkthrough_accuracy: adjudicationQuestions.html_walkthrough_accuracy,
        documentation_technical_prestige_score: adjudicationQuestions.documentation_technical_prestige_score,
        final_documentation_deployment_verdict: adjudicationQuestions.final_documentation_deployment_verdict
      },
      timeoutMs: 120000
    });

    const answers1 = res1.answers || res1.questions || res1;
    const answers2 = res2.answers || res2.questions || res2;
    const combinedAnswers = { ...answers1, ...answers2 };

    console.log('\n--- JEV SYSTEM ONE FINAL DOCUMENTATION VERDICTS ---');
    console.log(JSON.stringify(combinedAnswers, null, 2));

    const report = {
      timestamp: new Date().toISOString(),
      adjudicator: 'jev-1.13.0',
      total_context_chars: totalChars,
      readme_chars: readmeContent.length,
      html_chars: htmlContent.length,
      answers: combinedAnswers
    };

    const outPath = path.join(rootDir, 'test', 'jev-final-docs-verdict.json');
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\nFinal Docs Verdict saved to: ${outPath}`);
  } catch (err) {
    console.error('Fatal Docs Adjudication Error:', err.message);
    process.exit(1);
  }
}

runDocsAdjudication();
