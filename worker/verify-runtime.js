const tests = [
  { name: '/health', method: 'GET', url: 'http://localhost:3001/health' },
  { name: '/collect', method: 'POST', url: 'http://localhost:3001/collect', body: { uid: 'test' } },
  { name: '/apply', method: 'POST', url: 'http://localhost:3001/apply', body: { uid: 'test', jobId: 'job123' } },
  { name: '/pause', method: 'POST', url: 'http://localhost:3001/pause', body: { uid: 'test', jobId: 'job123', runId: 'run123' } },
  { name: '/resume', method: 'POST', url: 'http://localhost:3001/resume', body: { uid: 'test', jobId: 'job123', runId: 'run123' } },
  { name: '/cancel', method: 'POST', url: 'http://localhost:3001/cancel', body: { uid: 'test', jobId: 'job123', runId: 'run123' } },
  { name: '/confirm', method: 'POST', url: 'http://localhost:3001/confirm', body: { uid: 'test', jobId: 'job123', runId: 'run123' } },
  { name: '/status/:id', method: 'GET', url: 'http://localhost:3001/status/job123?uid=test' },
];

(async () => {
  for (const test of tests) {
    try {
      const init = { method: test.method, headers: { 'Content-Type': 'application/json' } };
      if (test.body) init.body = JSON.stringify(test.body);
      const res = await fetch(test.url, init);
      const text = await res.text();
      console.log(`${test.name} ${test.method} ${test.url} -> ${res.status}`);
      console.log(text);
    } catch (error) {
      console.error(`${test.name} ERROR`, error.stack || error.message || error);
    }
    console.log('---');
  }
})();
