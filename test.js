/**
 * Test suite for TypeSafe AI Jev MCP Server tools
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { callJevDecisions } from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

async function runTests() {
  console.log('====================================================');
  console.log('Starting TypeSafe Jev MCP Server Test Suite');
  console.log('TypeSafe API Key present:', !!(process.env.TYPESAFE_API_KEY || process.env.OPENROUTER_API_KEY));
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  // Test 1: callJevDecisions direct API call
  try {
    console.log('Test 1: Testing direct callJevDecisions API call...');
    const result = await callJevDecisions({
      state: 'The server responded with HTTP 500 Internal Server Error after a database connection timeout.',
      questions: {
        is_error: {
          type: 'noul',
          instructions: 'Does this text describe an error or outage?',
          criteria: {
            true: 'The text describes an error, bug, failure, or outage',
            false: 'The text describes normal or expected operation'
          }
        },
        issue_category: {
          type: 'choice',
          instructions: 'What kind of issue is described?',
          criteria: {
            database: 'Database related issue, timeout, or query failure',
            frontend: 'UI/UX or client side rendering issue',
            network: 'Network routing, DNS, or gateway failure'
          }
        },
        severity: {
          type: 'score',
          instructions: 'Score the severity of the incident',
          criteria: [
            'Minor cosmetic issue',
            'Degraded performance with workaround',
            'Severe outage affecting core functionality'
          ]
        }
      }
    });

    const roundedSeverity = Math.round(result.answers?.severity?.score);
    console.log('- Model used:', result.model);
    console.log('- Decision ID:', result.id);
    console.log('- is_error noul score:', result.answers?.is_error?.noul);
    console.log('- issue_category choice:', result.answers?.issue_category?.choice);
    console.log('- severity score:', result.answers?.severity?.score, '=>', result.answers?.severity?.legend?.[roundedSeverity] || result.answers?.severity?.legend?.[String(roundedSeverity)]);
    console.log('- Token usage:', result.usage);

    if (
      result.answers?.is_error?.noul > 0.5 &&
      result.answers?.issue_category?.choice === 'database' &&
      typeof result.answers?.severity?.score === 'number'
    ) {
      console.log('>>> Test 1 PASSED\n');
      passed++;
    } else {
      throw new Error('Unexpected answer format or values in Test 1');
    }
  } catch (err) {
    console.error('>>> Test 1 FAILED:', err.message, '\n');
    failed++;
  }

  // Test 2: jev_classify logic (string array categories)
  try {
    console.log('Test 2: Testing jev_classify logic with category list...');
    const sampleState = 'Can you show me how to upgrade my plan to Enterprise tier?';
    const categories = ['billing_sales', 'technical_support', 'product_feedback'];
    
    const criteria = {};
    for (const cat of categories) {
      criteria[cat] = cat;
    }

    const result = await callJevDecisions({
      state: sampleState,
      questions: {
        category: {
          type: 'choice',
          instructions: 'Classify the intent of the message.',
          criteria
        }
      }
    });

    const answer = result.answers?.category;
    console.log('- Input state:', sampleState);
    console.log('- Classified category:', answer?.choice);
    console.log('- Probabilities:', answer?.probabilities);
    console.log('- Confidence:', answer?.confidence);

    if (answer?.choice === 'billing_sales') {
      console.log('>>> Test 2 PASSED\n');
      passed++;
    } else {
      throw new Error(`Expected billing_sales, got ${answer?.choice}`);
    }
  } catch (err) {
    console.error('>>> Test 2 FAILED:', err.message, '\n');
    failed++;
  }

  // Test 3: jev_boolean_check logic
  try {
    console.log('Test 3: Testing jev_boolean_check logic...');
    const sampleState = 'const password = "admin_password_123"; // hardcoded secret';
    const assertion = 'Does this code snippet contain hardcoded credentials or secrets?';

    const result = await callJevDecisions({
      state: sampleState,
      questions: {
        assertion: {
          type: 'noul',
          instructions: assertion,
          criteria: {
            true: 'Code contains hardcoded passwords, tokens, or credentials',
            false: 'Code does not contain hardcoded credentials'
          }
        }
      }
    });

    const answer = result.answers?.assertion;
    const isTrue = answer?.noul >= 0.5;
    console.log('- Input snippet:', sampleState);
    console.log('- Assertion:', assertion);
    console.log('- Probability:', answer?.noul);
    console.log('- Boolean check result:', isTrue);

    if (isTrue === true && answer?.noul > 0.8) {
      console.log('>>> Test 3 PASSED\n');
      passed++;
    } else {
      throw new Error(`Expected boolean assertion to be true, got ${isTrue} (prob: ${answer?.noul})`);
    }
  } catch (err) {
    console.error('>>> Test 3 FAILED:', err.message, '\n');
    failed++;
  }

  // Test 4: jev_rubric_score logic
  try {
    console.log('Test 4: Testing jev_rubric_score logic...');
    const sampleEssay = 'This function is fast because it is good.';
    const rubricLevels = [
      'Level 0: No technical justification provided or completely inaccurate',
      'Level 1: Vague assertion without empirical evidence or algorithmic analysis',
      'Level 2: Clear explanation with complexity analysis or benchmark data',
      'Level 3: Comprehensive mathematical proof, benchmarks, and profiling data'
    ];

    const result = await callJevDecisions({
      state: sampleEssay,
      questions: {
        score: {
          type: 'score',
          instructions: 'Score the depth and rigour of the technical justification.',
          criteria: rubricLevels
        }
      }
    });

    const answer = result.answers?.score;
    const rounded = typeof answer?.score === 'number' ? Math.round(answer.score) : null;
    console.log('- Input state:', sampleEssay);
    console.log('- Rubric score:', answer?.score);
    console.log('- Rubric level description:', answer?.legend?.[rounded] || answer?.legend?.[String(rounded)] || rubricLevels[rounded]);
    console.log('- Confidence:', answer?.confidence);

    if (typeof answer?.score === 'number' && answer?.score <= 1.5) {
      console.log('>>> Test 4 PASSED (Accurately identified shallow explanation)\n');
      passed++;
    } else {
      throw new Error(`Expected score <= 1.5, got ${answer?.score}`);
    }
  } catch (err) {
    console.error('>>> Test 4 FAILED:', err.message, '\n');
    failed++;
  }

  // Test 5: Object state evaluation
  try {
    console.log('Test 5: Testing evaluation with structured JSON object state...');
    const objectState = {
      user: {
        id: 'usr_892',
        tier: 'free',
        api_requests_last_minute: 120,
        rate_limit: 60
      },
      action: 'POST /v1/chat/completions'
    };

    const result = await callJevDecisions({
      state: objectState,
      questions: {
        is_rate_limited: {
          type: 'noul',
          instructions: 'Has this user exceeded their rate limit for the requested action?'
        }
      }
    });

    const isRateLimited = result.answers?.is_rate_limited?.noul >= 0.5;
    console.log('- Structured state:', JSON.stringify(objectState));
    console.log('- Is rate limited:', isRateLimited, '(noul:', result.answers?.is_rate_limited?.noul, ')');

    if (isRateLimited === true) {
      console.log('>>> Test 5 PASSED\n');
      passed++;
    } else {
      throw new Error(`Expected is_rate_limited to be true, got ${isRateLimited}`);
    }
  } catch (err) {
    console.error('>>> Test 5 FAILED:', err.message, '\n');
    failed++;
  }

  console.log('====================================================');
  console.log(`Test Summary: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
