import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { extractInWorker } from '../lib/workers'
import { fetchAvailableModel } from '../lib/vllm'
import { computeRatios } from '../lib/ratios'
import { reconcileExtractionWithTextPages } from '../lib/textLayerExtraction'
import type { ExtractionResult, LiquidityFieldKey, ProgressState, RatioResult, SampleReport } from '../types/finance'
import { useReportStore } from './report'
import { useSettingsStore } from './settings'

export const useAnalysisStore = defineStore('analysis', () => {
  const extraction = ref<ExtractionResult | null>(null)
  const ratios = ref<RatioResult[]>([])
  const status = ref<'idle' | 'extracting' | 'ready' | 'error'>('idle')
  const error = ref('')
  const progress = ref<ProgressState>({
    phase: 'idle',
    percent: 0,
    message: 'OCR has not started yet.',
  })

  const reportStore = useReportStore()
  const settingsStore = useSettingsStore()

  const warnings = computed(() => {
    const result = extraction.value
    if (!result) return []
    return [...result.extractionWarnings, ...ratios.value.flatMap((ratio) => ratio.warnings)]
  })

  async function ensureModel() {
    progress.value = {
      phase: 'detecting_model',
      percent: 8,
      message: 'Detecting the active OCR model from vLLM.',
    }

    settingsStore.modelId = await fetchAvailableModel(settingsStore.baseUrl)

    return settingsStore.modelId
  }

  async function runExtraction() {
    if (!reportStore.source) {
      throw new Error('Load a report before extracting.')
    }

    status.value = 'extracting'
    error.value = ''
    progress.value = {
      phase: 'detecting_model',
      percent: 5,
      message: 'Detecting the active OCR model.',
    }

    try {
      const modelId = await ensureModel()
      const result = await extractInWorker(
        {
          baseUrl: settingsStore.baseUrl,
          modelId,
          pages: reportStore.candidatePages,
          source: reportStore.source,
          sampleMetadata: reportStore.sampleMetadata,
        },
        (nextProgress) => {
          progress.value = nextProgress
        },
      )

      const reconciledResult = reconcileExtractionWithTextPages(result, reportStore.renderedPages)

      extraction.value = reconciledResult
      ratios.value = computeRatios(reconciledResult.fields, reconciledResult.isFinancialInstitution)
      status.value = 'ready'
      progress.value = {
        phase: 'ready',
        percent: 100,
        message: 'Ratios are ready.',
      }
      return reconciledResult
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Extraction failed.'
      progress.value = {
        phase: 'error',
        percent: 100,
        message: error.value,
      }
      throw caught
    }
  }

  function reset() {
    extraction.value = null
    ratios.value = []
    status.value = 'idle'
    error.value = ''
    progress.value = {
      phase: 'idle',
      percent: 0,
      message: 'OCR has not started yet.',
    }
  }

  async function analyzeUpload(file: File) {
    reset()
    reportStore.reset()
    await reportStore.loadUpload(file)
    await runExtraction()
  }

  async function analyzeSample(sample: SampleReport) {
    reset()
    reportStore.reset()
    await reportStore.loadSample(sample)
    await runExtraction()
  }

  function updateField(key: LiquidityFieldKey, rawValue: string) {
    if (!extraction.value) return
    const value = rawValue.trim() === '' ? null : Number(rawValue)
    const field = extraction.value.fields.find((item) => item.key === key)
    if (!field || Number.isNaN(value)) return

    field.value = value
    field.status = value === null ? 'missing' : 'edited'
    ratios.value = computeRatios(extraction.value.fields, extraction.value.isFinancialInstitution)
  }

  function exportJson() {
    if (!extraction.value) return ''
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        appVersion: '0.1.0',
        extraction: extraction.value,
        ratios: ratios.value,
      },
      null,
      2,
    )
  }

  return {
    extraction,
    ratios,
    status,
    error,
    progress,
    warnings,
    runExtraction,
    analyzeUpload,
    analyzeSample,
    reset,
    updateField,
    exportJson,
  }
})
