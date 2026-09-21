import { safeParseJson } from '../harness/interceptor.js';

const cases = [
  [String.fromCharCode(0,1,2) + '{"tool":"view_file"}' + String.fromCharCode(127), 'binary chars + embedded JSON'],
  ['{"a": 1, "b": 2,}', 'trailing comma'],
  ["{'x': 'val', 'y': 42}", 'single-quoted JSON'],
  ['some raw text: tool: replace_file_content, target: auth.js', 'colon collision'],
  ['', 'empty string'],
  [null, 'null input'],
  ['{"unclosed": true', 'unclosed brace'],
];

let pass = 0;
for (const [raw, label] of cases) {
  try {
    const res = safeParseJson(raw);
    console.log('[PASS]', label, '->', JSON.stringify(res));
    pass++;
  } catch(e) {
    console.log('[FAIL] CRASHED on:', label, e.message);
  }
}
console.log(`\nsafeParseJson resilience: ${pass}/${cases.length} PASS`);
