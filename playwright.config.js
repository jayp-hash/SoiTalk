// Automated checks for Soi Talk (run: npm test).
// They start a pretend database (tests/mock-supabase.js) and a production build of the app,
// then walk the lessons and screens in a real browser at phone and laptop sizes.
// Set BASE_URL to test an app that is already running instead (for example a Vercel preview).
const { defineConfig } = require('@playwright/test');

const PORT = 3100;
const external = !!process.env.BASE_URL;

module.exports = defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.js/,
  timeout: 180_000,
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.BASE_URL || `http://127.0.0.1:${PORT}`,
    launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
  },
  webServer: external ? undefined : [
    {
      // The pretend database starts first: the build reads the course from it.
      command: `(node tests/mock-supabase.js &) && sleep 1 && npm run build && npx next start -p ${PORT}`,
      url: `http://127.0.0.1:${PORT}`,
      timeout: 600_000,
      reuseExistingServer: true,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        NEXT_PUBLIC_POSTHOG_KEY: 'phc_test',
        NEXT_PUBLIC_POSTHOG_HOST: 'http://127.0.0.1:9',
      },
    },
  ],
});
