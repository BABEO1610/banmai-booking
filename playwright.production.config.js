import { defineConfig, devices } from '@playwright/test'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'banmai-production-review-'))
export default defineConfig({
  testDir: './tests/e2e', timeout: 45000, workers: 2,
  use: { baseURL: 'http://127.0.0.1:4175', trace: 'retain-on-failure' },
  webServer: [
    { command: 'node server/src/index.js', url: 'http://127.0.0.1:3107/api/health', reuseExistingServer: false, env: { NODE_ENV: 'test', PORT: '3107', DATA_MODE: 'mock', PAYMENT_MODE: 'mock', EMAIL_MODE: 'mock', SHEETS_MODE: 'mock', SMS_MODE: 'mock', IMAGE_STORAGE: 'local', BANMAI_DATA_DIR: dataDir, PUBLIC_ORIGIN: 'http://127.0.0.1:4175', WORKER_MODE: 'in-process' } },
    { command: 'npm run preview --workspace client -- --host 127.0.0.1 --port 4175 --strictPort', url: 'http://127.0.0.1:4175', reuseExistingServer: false, env: { API_PROXY_TARGET: 'http://127.0.0.1:3107' } },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
