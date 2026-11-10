import assert from 'node:assert';

const API_BASE = 'http://localhost:4100/api';

async function runTests() {
  console.log('🧪 Starting Choke-Point Surgery Test Suite...\n');

  // Test 1: Programmatic / AI Extraction
  console.log('1. Testing Extraction Endpoint (POST /api/choke-points/extract)...');
  const sampleCode = `
function maxSubArray(nums) {
  let maxSum = nums[0];
  let currentSum = 0;
  for (let i = 0; i < nums.length; i++) {
    currentSum = Math.max(nums[i], currentSum + nums[i]);
    maxSum = Math.max(maxSum, currentSum);
  }
  return maxSum;
}
`;

  const extractRes = await fetch(`${API_BASE}/choke-points/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: sampleCode,
      title: 'Maximum Subarray (Kadane)',
      language: 'javascript'
    })
  });
  const extractData = await extractRes.json();
  assert.strictEqual(extractData.success, true, 'Extraction must succeed');
  assert.ok(extractData.choke_point.choke_code, 'Must have extracted choke code');
  assert.ok(extractData.choke_point.scaffold_code.includes('// ___CHOKE_POINT___') || extractData.choke_point.scaffold_code.includes('___CHOKE_POINT___'), 'Scaffold must have placeholder');
  console.log('   ✓ Extraction passed. Extracted hinge length:', extractData.choke_point.choke_code.length);

  // Test 2: Create Choke Point in Vault
  console.log('2. Testing Create Choke Point (POST /api/choke-points)...');
  const createPayload = {
    title: 'Binary Search Mid Condition',
    target_function: 'search',
    description: 'Implement the while condition, mid computation, and pointer narrowing.',
    language: 'javascript',
    choke_code: `  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) low = mid + 1;
    else high = mid - 1;
  }`,
    scaffold_code: `function search(nums, target) {
  let low = 0;
  let high = nums.length - 1;
  // ___CHOKE_POINT___
  return -1;
}`,
    test_cases: [
      { description: 'Found in middle', input: [[-1, 0, 3, 5, 9, 12], 9], expected: 4 },
      { description: 'Not found', input: [[-1, 0, 3, 5, 9, 12], 2], expected: -1 },
      { description: 'Single element found', input: [[5], 5], expected: 0 }
    ]
  };

  const createRes = await fetch(`${API_BASE}/choke-points`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createPayload)
  });
  const createData = await createRes.json();
  assert.strictEqual(createData.success, true, 'Create must succeed');
  const chokeId = createData.choke_point.id;
  assert.ok(chokeId, 'Must return created ID');
  console.log('   ✓ Choke point created with ID:', chokeId);

  // Test 3: List Choke Points & Due Queue
  console.log('3. Testing Listing & Due endpoints...');
  const listRes = await fetch(`${API_BASE}/choke-points`);
  const listData = await listRes.json();
  assert.ok(listData.choke_points.some(c => c.id === chokeId), 'Created point must be in list');

  const dueRes = await fetch(`${API_BASE}/choke-points/due`);
  const dueData = await dueRes.json();
  assert.strictEqual(dueData.success, true, 'Due query must succeed');
  console.log(`   ✓ Listing verified. Total: ${listData.choke_points.length}, Due: ${dueData.choke_points.length}`);

  // Test 4: Dry-Run Code Execution (Passing)
  console.log('4. Testing Dry-Run Test Runner (Passing Code)...');
  const runPassRes = await fetch(`${API_BASE}/choke-points/${chokeId}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_code: createPayload.choke_code })
  });
  const runPassData = await runPassRes.json();
  assert.strictEqual(runPassData.success, true);
  assert.strictEqual(runPassData.test_run.passed, true, 'All 3 tests must pass');
  assert.strictEqual(runPassData.test_run.passedCount, 3);
  console.log('   ✓ Dry-run passing assertions verified.');

  // Test 5: Dry-Run Code Execution (Failing / Buggy Code)
  console.log('5. Testing Dry-Run Test Runner (Failing Code)...');
  const buggyCode = '  while (low < high) { return -1; }';
  const runFailRes = await fetch(`${API_BASE}/choke-points/${chokeId}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_code: buggyCode })
  });
  const runFailData = await runFailRes.json();
  assert.strictEqual(runFailData.success, true);
  assert.strictEqual(runFailData.test_run.passed, false, 'Buggy code must not pass');
  console.log('   ✓ Dry-run failure handling verified.');

  // Test 6: Finalize Surgery Review (FSRS & Pacey Verdict)
  console.log('6. Testing Finalize Surgery Review (POST /api/choke-points/:id/review)...');
  const reviewRes = await fetch(`${API_BASE}/choke-points/${chokeId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_code: createPayload.choke_code,
      elapsed_ms: 22000 // 22s fast solve
    })
  });
  const reviewData = await reviewRes.json();
  assert.strictEqual(reviewData.success, true);
  assert.strictEqual(reviewData.test_run.passed, true);
  assert.ok(reviewData.pacey_verdict.critique, 'Pacey must deliver a critique');
  assert.ok(reviewData.choke_point.fsrs_stability > 2.0, 'FSRS stability must increase after clean surgery');
  console.log('   ✓ Pacey Verdict:', reviewData.pacey_verdict.verdict);
  console.log('   ✓ New FSRS Stability:', reviewData.choke_point.fsrs_stability);

  // Test 7: Stats Verification
  console.log('7. Testing Stats Endpoint (GET /api/choke-points/stats)...');
  const statsRes = await fetch(`${API_BASE}/choke-points/stats`);
  const statsData = await statsRes.json();
  assert.strictEqual(statsData.success, true);
  assert.ok(statsData.stats.total >= 1);
  assert.ok(statsData.stats.total_reviews >= 1);
  console.log('   ✓ Stats verified:', statsData.stats);

  // Test 8: Clean up
  console.log('8. Testing Delete Choke Point (DELETE /api/choke-points/:id)...');
  const delRes = await fetch(`${API_BASE}/choke-points/${chokeId}`, { method: 'DELETE' });
  const delData = await delRes.json();
  assert.strictEqual(delData.success, true);
  console.log('   ✓ Cleaned up test choke point.');

  console.log('\n🎉 ALL 8 CHOKE-POINT SURGERY TESTS PASSED WITH 100% SUCCESS!\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
