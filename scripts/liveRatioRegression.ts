import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium } from 'playwright'
import { liveRatioCases } from './liveRatioCases.ts'

const appHost = '127.0.0.1'
const appPort = Number(process.env.LIVE_RATIO_PORT ?? 3004)
const appUrl = process.env.APP_URL ?? `http://${appHost}:${appPort}/`
const vllmBaseUrl = process.env.VLLM_BASE_URL ?? 'http://127.0.0.1:8000'
const tolerance = 1e-9

function closeEnough(actual: number | null | undefined, expected: number | null | undefined) {
  if (actual === null && expected === null) return true
  if (typeof actual !== 'number' || typeof expected !== 'number') return false
  return Math.abs(actual - expected) <= tolerance
}

function toFieldMap(fields: Array<{ key: string; value: number | null }>) {
  return Object.fromEntries(fields.map((field) => [field.key, field.value]))
}

function toRatioMap(ratios: Array<{ key: string; value: number | null }>) {
  return Object.fromEntries(ratios.map((ratio) => [ratio.key, ratio.value]))
}

async function waitForServer(url: string) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Retry until the server is ready.
    }

    await delay(500)
  }

  throw new Error(`Timed out waiting for ${url}`)
}

function startDevServer() {
  const child = spawn('npm', ['run', 'dev', '--', '--host', appHost, '--port', String(appPort)], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let output = ''
  const capture = (chunk: Buffer) => {
    output = `${output}${chunk.toString('utf8')}`.slice(-4000)
  }

  child.stdout.on('data', capture)
  child.stderr.on('data', capture)

  return {
    child,
    output: () => output,
  }
}

async function stopDevServer(child: ChildProcessWithoutNullStreams | null) {
  if (!child || child.killed) return

  child.kill('SIGTERM')
  await delay(250)
  if (!child.killed) child.kill('SIGKILL')
}

async function main() {
  if (liveRatioCases.length === 0) {
    console.log('No live ratio regression cases are configured.')
    return
  }

  let server: ReturnType<typeof startDevServer> | null = null

  try {
    if (!process.env.APP_URL) {
      server = startDevServer()
      await waitForServer(appUrl)
    }

    const browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()
    await page.addInitScript((storedBaseUrl) => {
      localStorage.setItem('fva-settings', JSON.stringify({ baseUrl: storedBaseUrl }))
    }, vllmBaseUrl)
    await page.goto(appUrl)
    await page.waitForLoadState('networkidle')
    await page.locator('input[type="url"]').fill(vllmBaseUrl)

    const failures: string[] = []

    for (const testCase of liveRatioCases) {
      await page.locator('select.input').selectOption(testCase.sampleId)
      await page.getByRole('button', { name: 'Open sample now' }).click()
      await page.waitForFunction(
        (sampleId) => {
          const pre = document.querySelector('.export-block')
          if (!pre) return false

          try {
            const payload = JSON.parse(pre.textContent || '{}')
            return payload?.extraction?.source?.sampleId === sampleId && payload?.ratios?.length === 3
          } catch {
            return false
          }
        },
        testCase.sampleId,
        { timeout: 240000 },
      )

      const payload = JSON.parse((await page.locator('.export-block').textContent()) || '{}') as {
        extraction: { fields: Array<{ key: string; value: number | null }>; extractionWarnings: string[] }
        ratios: Array<{ key: string; value: number | null }>
      }
      const actualFields = toFieldMap(payload.extraction.fields)
      const actualRatios = toRatioMap(payload.ratios)

      const fieldFailures = Object.entries(testCase.expectedFields).filter(
        ([key, expected]) => !closeEnough(actualFields[key], expected),
      )
      const ratioFailures = Object.entries(testCase.expectedRatios).filter(
        ([key, expected]) => !closeEnough(actualRatios[key], expected),
      )

      if (fieldFailures.length === 0 && ratioFailures.length === 0) {
        console.log(`${testCase.sampleId} ok ${JSON.stringify(actualRatios)}`)
        continue
      }

      const failure = [
        `${testCase.sampleId} mismatch`,
        `fields: ${JSON.stringify(fieldFailures.map(([key, expected]) => ({ key, expected, actual: actualFields[key] })))}`,
        `ratios: ${JSON.stringify(ratioFailures.map(([key, expected]) => ({ key, expected, actual: actualRatios[key] })))}`,
        `warnings: ${JSON.stringify(payload.extraction.extractionWarnings)}`,
      ].join('\n')
      failures.push(failure)
      console.error(failure)
    }

    await browser.close()

    if (failures.length > 0) {
      process.exitCode = 1
      return
    }

    console.log(`ALL_OK ${liveRatioCases.length}`)
  } catch (error) {
    if (server) {
      console.error(server.output())
    }
    throw error
  } finally {
    await stopDevServer(server?.child ?? null)
  }
}

await main()
