import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: { FESTATUSLINE_VERSION: JSON.stringify('0.0.0-test') },
  test: {
    include: ['test/**/*.test.ts'],
  },
});
