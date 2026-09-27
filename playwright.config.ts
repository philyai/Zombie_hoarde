import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests', timeout: 60000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:5173', browserName: 'chromium', channel: 'msedge', headless: true, viewport: {width:1280,height:720}, screenshot:'only-on-failure' },
  webServer: {command:'npm.cmd run dev -- --host 127.0.0.1',url:'http://127.0.0.1:5173',reuseExistingServer:true},
  reporter: [['list'], ['json', {outputFile:'artifacts/test-results.json'}]],
})
