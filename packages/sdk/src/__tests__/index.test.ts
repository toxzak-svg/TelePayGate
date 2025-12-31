import defaultExport, { TelePayGate } from '../index';
import * as indexNs from '../index';

test('index exports default and named TelePayGate', () => {
  // Ensure the module resolves and both exports refer to the same constructor
  expect(typeof defaultExport).toBe('function');
  expect(typeof TelePayGate).toBe('function');
  // They should be strictly equal (re-exported default)
  expect(defaultExport).toBe(TelePayGate);
  // Namespace import should expose both named and default exports
  expect(typeof indexNs.TelePayGate).toBe('function');
  expect(indexNs.default).toBe(defaultExport);
});

test('dynamic import of index executes module and exposes default', async () => {
  const mod = await import('../index');
  expect(mod.default).toBeDefined();
  expect(mod.TelePayGate).toBeDefined();
});
