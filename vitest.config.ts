import { defineConfig } from 'vitest/config';

// Keep console output from passing tests: the specs print one RESULT line each.
export default defineConfig({
  test: { silent: false },
});
