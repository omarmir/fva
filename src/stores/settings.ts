import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { normalizeVllmBaseUrl } from '../lib/vllm'

const STORAGE_KEY = 'fva-settings'

type PersistedSettings = {
  baseUrl?: string
}

export const useSettingsStore = defineStore('settings', () => {
  const persisted: PersistedSettings | null = (() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as PersistedSettings | null
    } catch {
      return null
    }
  })()

  const defaultBaseUrl = import.meta.env.DEV ? '/api/vllm' : 'http://192.168.2.101:8000'
  const baseUrl = ref(normalizeVllmBaseUrl(persisted?.baseUrl ?? defaultBaseUrl))
  const modelId = ref('')

  watch(baseUrl, (value) => {
    const normalized = normalizeVllmBaseUrl(value)
    if (normalized !== value) {
      baseUrl.value = normalized
    }
  })

  watch(
    baseUrl,
    () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          baseUrl: normalizeVllmBaseUrl(baseUrl.value),
        }),
      )
    },
  )

  return {
    baseUrl,
    modelId,
  }
})
