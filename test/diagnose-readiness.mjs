import { callJevSystemOne } from '../harness/jev-client.js';

async function diagnoseReadiness() {
  const state = {
    harness: 'TypeSafe Aegis v2.1',
    rubric_score: 2.9,
    deployment_tier: 'ready_for_production (0.64)',
    status: {
      tests: '11/11 npm test passed, 11/11 breach tests passed, 5/5 MCP server tests passed',
      code_sealed: true,
      readme_present: false, // README.md has not been written yet
      documentation_status: 'README.md pending finalization'
    }
  };

  const questions = {
    doc_dependency: {
      type: 'noul',
      instructions: 'Is the absence of a comprehensive user-facing README.md and operational documentation a primary reason this codebase is considered not yet fully ready for end-user deployment?',
      criteria: {
        true: 'Yes, production readiness requires comprehensive developer documentation, quickstart guides, and deployment instructions in README.md.',
        false: 'No, documentation status does not affect production readiness.'
      }
    },
    code_integrity: {
      type: 'noul',
      instructions: 'Is the core JavaScript code implementation in harness/ technically sound, secure, and ready for deployment once documented?',
      criteria: {
        true: 'The code implementation itself is sound, secure, passes all verification gates, and is ready for use once documented.',
        false: 'The code has remaining flaws that require refactoring before any deployment.'
      }
    },
    actionable_next_step: {
      type: 'choice',
      instructions: 'What is the most critical immediate next step for the team?',
      criteria: {
        write_comprehensive_readme: 'Generate complete README.md with architecture, quickstart, hook configs, and verification results.',
        refactor_code_modules: 'Refactor additional code in harness/ before writing any documentation.',
        sandbox_trial_run: 'Run a live trial run with an agent.'
      }
    }
  };

  const res = await callJevSystemOne({ state, questions });
  console.log(JSON.stringify(res.answers, null, 2));
}

diagnoseReadiness().catch(console.error);
