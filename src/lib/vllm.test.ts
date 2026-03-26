import { describe, expect, it } from 'vitest'
import { buildVllmUrl, normalizeVllmBaseUrl } from './vllm'

describe('normalizeVllmBaseUrl', () => {
  it('keeps a plain host unchanged', () => {
    expect(normalizeVllmBaseUrl('http://192.168.2.101:8000')).toBe('http://192.168.2.101:8000')
  })

  it('strips a trailing /v1 segment', () => {
    expect(normalizeVllmBaseUrl('http://192.168.2.101:8000/v1')).toBe('http://192.168.2.101:8000')
  })

  it('strips a full chat completions path', () => {
    expect(normalizeVllmBaseUrl('http://192.168.2.101:8000/v1/chat/completions')).toBe(
      'http://192.168.2.101:8000',
    )
  })

  it('keeps a relative proxy path unchanged', () => {
    expect(normalizeVllmBaseUrl('/api/vllm')).toBe('/api/vllm')
  })

  it('strips a trailing /v1 segment from a relative proxy path', () => {
    expect(normalizeVllmBaseUrl('/api/vllm/v1')).toBe('/api/vllm')
  })
})

describe('buildVllmUrl', () => {
  it('builds the correct models URL from a pasted /v1 endpoint', () => {
    expect(buildVllmUrl('http://192.168.2.101:8000/v1', '/v1/models')).toBe(
      'http://192.168.2.101:8000/v1/models',
    )
  })

  it('builds the correct models URL from a relative proxy path', () => {
    expect(buildVllmUrl('/api/vllm', '/v1/models')).toBe('/api/vllm/v1/models')
  })
})
