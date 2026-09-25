import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanActivePage } from './scan';

test('reconnects an already-open shopping tab after extension reload', async () => {
  let messages = 0;
  let injections = 0;
  Object.assign(globalThis, { chrome: {
    tabs: { query: async () => [{ id: 12, url: 'https://www.amazon.in/s?k=shirt' }],
      sendMessage: async () => {
        if (++messages === 1) throw new Error('Could not establish connection. Receiving end does not exist.');
        return { products: [] };
      } },
    scripting: { executeScript: async (options: unknown) => {
      assert.deepEqual(options, { target: { tabId: 12 }, files: ['assets/content.js'] });
      injections++;
    } },
  } });
  assert.deepEqual(await scanActivePage(), { products: [] });
  assert.equal(messages, 2);
  assert.equal(injections, 1);
});

test('explains unsupported pages without attempting injection', async () => {
  Object.assign(globalThis, { chrome: { tabs: { query: async () => [{ id: 12, url: 'chrome://extensions/' }] } } });
  await assert.rejects(scanActivePage(), /Open a shopping website/);
});
