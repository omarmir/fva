import { normalizeModelContent } from '../lib/extractionNormalization'
import { buildPrompt, buildVllmUrl } from '../lib/vllm'
import type { ProgressState, RankedPdfPage, ReportSource, SampleReport } from '../types/finance'

type RequestPayload = {
  baseUrl: string
  modelId: string
  pages: RankedPdfPage[]
  source: ReportSource
  sampleMetadata: SampleReport | null
}

function emit(progress: ProgressState) {
  self.postMessage({ type: 'progress', progress })
}

function readErrorMessage(status: number, responseText: string, requestUrl: string) {
  try {
    const parsed = JSON.parse(responseText) as {
      error?: { message?: string }
      message?: string
    }
    const apiMessage = parsed.error?.message ?? parsed.message
    if (apiMessage) {
      return `vLLM chat completion failed with status ${status} at ${requestUrl}: ${apiMessage}`
    }
  } catch {
    // Ignore JSON parsing errors and fall back to raw text.
  }

  const detail = responseText.trim()
  if (detail) {
    return `vLLM chat completion failed with status ${status} at ${requestUrl}: ${detail}`
  }

  return `vLLM chat completion failed with status ${status} at ${requestUrl}.`
}

self.onmessage = async (event: MessageEvent<RequestPayload>) => {
  try {
    const { baseUrl, modelId, pages, source, sampleMetadata } = event.data
    const completionsUrl = buildVllmUrl(baseUrl, '/v1/chat/completions')
    emit({ phase: 'extracting', percent: 10, message: `Preparing candidate page images for ${modelId}.` })
    const content = buildPrompt(pages)

    emit({ phase: 'extracting', percent: 35, message: `Sending page images to ${modelId}.` })
    const response = await fetch(completionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId,
        temperature: 0,
        ...(modelId.toLowerCase().includes('qwen')
          ? {
              response_format: {
                type: 'json_object',
              },
            }
          : {}),
        messages: [
          {
            role: 'user',
            content,
          },
        ],
      }),
    })

    if (!response.ok) {
      const responseText = await response.text()
      throw new Error(readErrorMessage(response.status, responseText, completionsUrl))
    }

    emit({ phase: 'parsing', percent: 78, message: 'Normalizing OCR output into liquidity fields.' })
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const modelText = payload.choices?.[0]?.message?.content
    if (!modelText) {
      throw new Error('The model returned no message content.')
    }

    const result = normalizeModelContent(modelText, {
      modelId,
      source,
      fallbackPageNumber: pages[0]?.pageNumber ?? 1,
      sampleMetadata,
    })

    emit({ phase: 'ready', percent: 100, message: 'OCR finished and ratios are ready.' })
    self.postMessage({ type: 'done', result })
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Extraction failed.',
    })
  }
}

export {}
