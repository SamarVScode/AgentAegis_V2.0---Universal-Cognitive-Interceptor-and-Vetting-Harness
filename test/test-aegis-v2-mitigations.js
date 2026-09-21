/**
 * Test Suite for TypeSafe Aegis v2.0 Mitigations & Multi-Archetype Governance
 * (test/test-aegis-v2-mitigations.js)
 * 
 * Tests the 5 core fixes:
 *   1. Scoped Header Map Law & Pragma Bypass (Web/Backend/Android array indexing freedom)
 *   2. Numeric Timestamp Exemption across RPC (Date.now(), .getTime())
 *   3. Virtual Whole-File Shadow Buffer Diff Variance (replace_file_content)
 *   4. Event-Driven Windows Stdin Reader (350ms grace timeout)
 *   5. Benign Stderr Triage Filter in Dual-Stage Acceptance Gate
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

import { isGasContext, isGasTarget, detectWorkspaceEcosystem } from '../harness/manifest-sniffer.js';
import { lintCoreLaws, isCoreLawsViolated } from '../harness/core-laws-linter.js';
import { reconstructShadowBuffer, checkCycle, clearHistory, getShadowPaths } from '../harness/cycle-detector.js';
import { readStdinJson, safeParseJson } from '../harness/interceptor.js';
import { triageStderr, parseTestRunnerOutput, BENIGN_STDERR_PATTERNS } from '../harness/runner-parser.js';
import { verifyAcceptanceGate } from '../harness/acceptance-gate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runV2MitigationTests() {
  console.log('================================================================================');
  console.log('STARTING TYPESAFE AEGIS V2.0 MITIGATION & MULTI-ARCHETYPE TEST SUITE');
  console.log('Cognitive Authority: TypeSafe AI Jev (jev-1.13.0)');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 1: FIX 1 - Scoped Header Map Law & Inline Pragmas
  // -------------------------------------------------------------------------
  console.log('--- [Group 1: FIX 1 - Scoped Header Map Law & Pragmas] ---');
  try {
    // 1.1 Web Application: React / Node array indexing must be permitted (0 violations)
    const reactCode = `
      function TableView({ rows }) {
        return rows.map((row, i) => (
          <tr key={i}>
            <td>{row[0]}</td>
            <td>{row[1]}</td>
            <td>{row[2]}</td>
          </tr>
        ));
      }
    `;
    const reactReport = lintCoreLaws(reactCode, 'src/components/TableView.tsx');
    assert(reactReport.clean === true, 'React TableView row[0], row[1], row[2] permitted with 0 violations');

    // 1.2 Backend Python: lines[0], items[1] in Python must be permitted
    const pyCode = `
      def parse_csv(lines):
          header = lines[0]
          first_row = lines[1]
          return {"header": header, "data": first_row}
    `;
    const pyReport = lintCoreLaws(pyCode, 'backend/services/importer.py');
    assert(pyReport.clean === true, 'Python lines[0], lines[1] permitted with 0 violations');

    // 1.3 Android Kotlin / Java: items[0], record[1] must be permitted
    const ktCode = `
      fun processRecords(records: List<String>) {
          val first = records[0]
          val second = records[1]
      }
    `;
    const ktReport = lintCoreLaws(ktCode, 'android/app/src/main/java/Repository.kt');
    assert(ktReport.clean === true, 'Android Kotlin records[0], records[1] permitted with 0 violations');

    // 1.4 Google Apps Script: row[2] in .gs MUST be caught
    const gasCode = `
      function processSheet() {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
        const data = sheet.getDataRange().getValues();
        const status = row[2]; // hardcoded numeric index
      }
    `;
    const gasReport = lintCoreLaws(gasCode, 'gas/Code.gs');
    assert(gasReport.clean === false, 'GAS Code.gs hardcoded index caught as violation');
    assert(gasReport.violations.some(v => v.law === 'HEADER_MAP_LAW'), 'Report specifies HEADER_MAP_LAW');

    // 1.5 Inline Pragma Bypass in GAS: // aegis-ignore: header-map-law
    const pragmaGasCode = `
      function legacyMigration() {
        // aegis-ignore: header-map-law
        const status = row[2];
        return status;
      }
    `;
    const pragmaReport = lintCoreLaws(pragmaGasCode, 'gas/Migration.gs');
    assert(pragmaReport.clean === true, 'Inline pragma // aegis-ignore: header-map-law cleanly bypasses Header Map Law');

    console.log('✅ Group 1 (Scoped Header Map & Pragmas) passed all assertions.');
    passed++;
  } catch (err) {
    console.error('❌ Group 1 failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 2: FIX 2 - Numeric Timestamps across RPC
  // -------------------------------------------------------------------------
  console.log('\n--- [Group 2: FIX 2 - Numeric Timestamps & RPC Serialization] ---');
  try {
    // 2.1 Date.now() millisecond timestamp must be permitted
    const dateNowRpc = 'google.script.run.recordHeartbeat(Date.now());';
    const r1 = lintCoreLaws(dateNowRpc, 'gas/Client.html');
    assert(r1.clean === true, 'Date.now() across google.script.run permitted');

    // 2.2 date.getTime() numeric timestamp must be permitted
    const getTimeRpc = 'google.script.run.submitTimestamp(new Date().getTime());';
    const r2 = lintCoreLaws(getTimeRpc, 'gas/Client.html');
    assert(r2.clean === true, 'new Date().getTime() across google.script.run permitted');

    // 2.3 date.toISOString() string timestamp must be permitted
    const isoRpc = 'google.script.run.saveAudit(new Date().toISOString());';
    const r3 = lintCoreLaws(isoRpc, 'gas/Client.html');
    assert(r3.clean === true, 'new Date().toISOString() across google.script.run permitted');

    // 2.4 date.valueOf() numeric timestamp must be permitted
    const valueOfRpc = 'google.script.run.setTimer(new Date().valueOf());';
    const r4 = lintCoreLaws(valueOfRpc, 'gas/Client.html');
    assert(r4.clean === true, 'new Date().valueOf() across google.script.run permitted');

    // 2.5 Raw un-serialized new Date() object instance MUST be vetoed
    const rawDateRpc = 'google.script.run.submitPayload(new Date());';
    const r5 = lintCoreLaws(rawDateRpc, 'gas/Client.html');
    assert(r5.clean === false && r5.violations.some(v => v.law === 'SAFE_SERIALIZATION_LAW'), 'Raw un-serialized new Date() across RPC vetoed');

    // 2.6 Raw un-serialized new Blob() object instance MUST be vetoed
    const rawBlobRpc = 'google.script.run.uploadFile(new Blob());';
    const r6 = lintCoreLaws(rawBlobRpc, 'gas/Client.html');
    assert(r6.clean === false && r6.violations.some(v => v.law === 'SAFE_SERIALIZATION_LAW'), 'Raw un-serialized new Blob() across RPC vetoed');

    console.log('✅ Group 2 (Numeric Timestamps & RPC Serialization) passed all assertions.');
    passed++;
  } catch (err) {
    console.error('❌ Group 2 failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 3: FIX 3 - Virtual Whole-File Shadow Buffer Diff Variance
  // -------------------------------------------------------------------------
  console.log('\n--- [Group 3: FIX 3 - Shadow Buffer Reconstruction & Diff Variance] ---');
  try {
    const testSession = `test-shadow-${Date.now()}`;
    clearHistory(testSession);

    // Create a temporary 50-line file on disk
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-shadow-'));
    const testFile = path.join(tmpDir, 'LargeModule.js');

    const originalLines = [];
    for (let i = 1; i <= 50; i++) {
      originalLines.push(`function step${i}() { return ${i}; }`);
    }
    fs.writeFileSync(testFile, originalLines.join('\n'), 'utf8');

    // Edit 1: Replace line 5
    const reconstructed1 = reconstructShadowBuffer(
      testFile,
      'function step5() { return 5; }',
      'function step5() { return 500; /* updated */ }',
      testSession
    );
    assert(reconstructed1.includes('return 500;'), 'Shadow buffer contains first replacement');

    // Verify shadow file on disk
    const { shadowFile } = getShadowPaths(testSession, testFile);
    assert(fs.existsSync(shadowFile), 'Shadow file created on disk in .jev/<session>/shadow/');

    // Edit 2: Replace line 20
    const reconstructed2 = reconstructShadowBuffer(
      testFile,
      'function step20() { return 20; }',
      'function step20() { return 2000; }',
      testSession
    );
    assert(reconstructed2.includes('return 500;') && reconstructed2.includes('return 2000;'), 'Shadow buffer retains both sequential edits');

    // Edit 3: Substantive edit (>15% variance across full buffer)
    let substantiveEdit3 = reconstructed2;
    for (let i = 51; i <= 65; i++) {
      substantiveEdit3 += `\nfunction step${i}() { return ${i * 100}; }`;
    }

    // Cycle detector should recognize substantive full-buffer evolution across edits
    checkCycle('replace_file_content', testFile, reconstructed1, testSession);
    checkCycle('replace_file_content', testFile, reconstructed2, testSession);
    const pass3 = checkCycle('replace_file_content', testFile, substantiveEdit3, testSession);
    assert(pass3.isThrashing === false, 'Substantive full-buffer changes permitted without premature cycle trip');

    // Cleanup
    clearHistory(testSession);
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

    console.log('✅ Group 3 (Shadow Buffer Reconstruction & Diff Variance) passed all assertions.');
    passed++;
  } catch (err) {
    console.error('❌ Group 3 failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 4: FIX 4 - Event-Driven Stdin Reader with Platform Grace
  // -------------------------------------------------------------------------
  console.log('\n--- [Group 4: FIX 4 - Event-Driven Stdin Stream Reading] ---');
  try {
    // 4.1 safeParseJson resilience
    const parsedObj = safeParseJson('{"toolCall": {"name": "view_file", "args": {"path": "index.js"}}}');
    assert(parsedObj.toolCall?.name === 'view_file', 'safeParseJson parses structured tool call');

    // 4.2 readStdinJson in non-TTY resolves immediately or gracefully
    const tStart = Date.now();
    const result = await readStdinJson(50); // fast 50ms test timeout
    const elapsed = Date.now() - tStart;
    assert(elapsed >= 0 && elapsed <= 250, 'readStdinJson returns without hanging');
    assert(typeof result === 'object', 'readStdinJson returns parsed object');

    console.log('✅ Group 4 (Event-Driven Stdin Stream Reading) passed all assertions.');
    passed++;
  } catch (err) {
    console.error('❌ Group 4 failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 5: FIX 5 - Benign Stderr Triage Filter in Acceptance Gate
  // -------------------------------------------------------------------------
  console.log('\n--- [Group 5: FIX 5 - Benign Stderr Triage Filter] ---');
  try {
    // 5.1 ExperimentalWarning should be triaged as benign
    const expWarning = '(node:39204) ExperimentalWarning: VM Modules is an experimental feature.\n(Use `node --trace-warnings ...` to show where the warning was created)';
    const t1 = triageStderr(expWarning);
    assert(t1.isBenign === true, 'ExperimentalWarning triaged as benign (isBenign: true)');
    assert(t1.cleanedStderr === '', 'cleanedStderr is empty after benign filter');

    // 5.2 DeprecationWarning should be triaged as benign
    const depWarning = '(node:1234) DeprecationWarning: punycode module is deprecated. Please use a userland alternative.';
    const t2 = triageStderr(depWarning);
    assert(t2.isBenign === true, 'DeprecationWarning triaged as benign');

    // 5.3 Combined benign warnings
    const combinedBenign = `${expWarning}\n${depWarning}`;
    const t3 = triageStderr(combinedBenign);
    assert(t3.isBenign === true, 'Multiple combined benign warnings triaged as benign');

    // 5.4 Genuine critical error in stderr MUST NOT be triaged as benign
    const genuineError = `${expWarning}\nTypeError: Cannot read properties of undefined (reading 'token')\n    at authenticate (auth.js:42:15)`;
    const t4 = triageStderr(genuineError);
    assert(t4.isBenign === false, 'Genuine TypeError is NOT benign (isBenign: false)');
    assert(t4.cleanedStderr.includes('TypeError: Cannot read properties'), 'cleanedStderr retains genuine crash trace');

    // 5.5 parseTestRunnerOutput enforces testsRun >= 1 on fallback
    const fallbackRun = parseTestRunnerOutput('node', 'All passed successfully\nDone in 0.4s', '', 0);
    assert(fallbackRun.passed === true && fallbackRun.testsRun >= 1, 'Generic fallback enforces testsRun >= 1');

    console.log('✅ Group 5 (Benign Stderr Triage Filter) passed all assertions.');
    passed++;
  } catch (err) {
    console.error('❌ Group 5 failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n================================================================================');
  console.log(`TYPESAFE AEGIS V2.0 MITIGATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runV2MitigationTests().catch(err => {
  console.error('Mitigation test suite failed:', err);
  process.exit(1);
});
