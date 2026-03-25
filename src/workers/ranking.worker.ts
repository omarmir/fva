import { rankCandidatePages } from '../lib/pageRanking'
import type { RenderedPdfPage } from '../types/finance'

self.onmessage = (event: MessageEvent<{ pages: RenderedPdfPage[] }>) => {
  try {
    const pages = rankCandidatePages(event.data.pages)
    self.postMessage({ type: 'done', pages })
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Failed to rank candidate pages.',
    })
  }
}

export {}
