import { chromium } from '@playwright/test'
import { demoCatalog } from '../client/src/hooks/useCatalog.js'

// Read-only, headless smoke measurement, not a production Lighthouse/device benchmark.
const browser = await chromium.launch()
const baseURL = process.env.UI_AUDIT_URL || 'http://localhost:5173'
const sampleCount = Number(process.env.UI_AUDIT_SAMPLES) || 120
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 960 } })
    const errors = []
    const requests = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('request', (request) => requests.push(request.url()))
    await page.route('**/api/v1/**', (route) => {
      const key = new URL(route.request().url()).pathname.split('/').at(-1)
      return route.fulfill({ json: { data: key === 'me' ? { user: null, csrfToken: null } : demoCatalog[key] || [] } })
    })
    await page.addInitScript(() => {
      window.uiMetrics = { lcpMs: null, cls: 0 }
      new PerformanceObserver((list) => { window.uiMetrics.lcpMs = list.getEntries().at(-1).startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
      new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.uiMetrics.cls += entry.value }).observe({ type: 'layout-shift', buffered: true })
    })
    await page.goto(`${baseURL}/portfolio?concept=color`)
    await page.locator('.concept-collection').waitFor()
    if (requests.some((url) => /studio-3d.*\.js/.test(url))) throw new Error('GPU engine was requested on a non-landing route')
    console.log(JSON.stringify({ width, portfolioLoads3DEngine: false }))
    await page.goto(baseURL)
    await page.evaluate(() => document.fonts.ready)
    await page.locator('.camera-installation[data-mode="3d"]').waitFor({ timeout: 20000 })
    await page.locator('.hero-scene').scrollIntoViewIfNeeded()
    await page.mouse.move(0, 0)
    const sampleFrames = () => page.evaluate((sampleCount) => new Promise((resolve) => {
      const deltas = []
      const started = performance.now(), canvas = document.querySelector('.camera-canvas canvas')
      const firstRender = Number(canvas.dataset.frame)
      let previous
      const frame = (time) => {
        if (previous !== undefined) deltas.push(time - previous)
        previous = time
        if (deltas.length < sampleCount) return requestAnimationFrame(frame)
        const sorted = [...deltas].sort((a, b) => a - b)
        resolve({ meanFrameMs: deltas.reduce((a, b) => a + b, 0) / deltas.length, p95FrameMs: sorted[Math.floor(sorted.length * .95)], framesOver33Ms: deltas.filter((value) => value > 33.4).length, renderedFramesPerSecond: (Number(canvas.dataset.frame) - firstRender) / ((performance.now() - started) / 1000), drawCalls: Number(canvas.dataset.drawCalls), pixelRatio: Number(canvas.dataset.pixelRatio), lightweight: canvas.dataset.lightweight === 'true' })
      }
      requestAnimationFrame(frame)
    }), sampleCount)
    // Log first-window adaptation separately, then measure the steady scene.
    const adaptiveWarmup = await sampleFrames()
    const frames = await sampleFrames()
    await page.getByRole('button', { name: /Tạm dừng nền động/ }).click()
    const pausedFrames = await sampleFrames()
    await page.getByRole('button', { name: /Bật nền động/ }).click()
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    await page.screenshot({ path: `test-results/ui-audit-${width}.png` })
    console.log(JSON.stringify({ width, sceneMode: await page.locator('.camera-installation').getAttribute('data-mode'), ...await page.evaluate(() => window.uiMetrics), adaptiveWarmup, animated: frames, pausedBaseline: pausedFrames, javascriptErrors: errors }, null, 2))
    await page.close()
  }
} finally { await browser.close() }
