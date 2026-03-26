<script setup lang="ts">
import { ref } from 'vue'
import { sampleReports } from '../data/samples'
import { useAnalysisStore } from '../stores/analysis'
import { useSettingsStore } from '../stores/settings'

const settingsStore = useSettingsStore()
const analysisStore = useAnalysisStore()
const selectedSampleId = ref(sampleReports[0]?.id ?? '')

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  await analysisStore.analyzeUpload(file)
}

async function openSample() {
  const sample = sampleReports.find((item) => item.id === selectedSampleId.value)
  if (!sample) return
  await analysisStore.analyzeSample(sample)
}
</script>

<template>
  <aside class="rail">
    <section>
      <p class="section-label">Source</p>
      <label class="dropzone">
        <span>Upload a financial report PDF and OCR starts immediately.</span>
        <input accept="application/pdf" type="file" @change="onFileChange" />
      </label>
    </section>

    <section>
      <p class="section-label">Samples</p>
      <div class="stack">
        <select v-model="selectedSampleId" class="input">
          <option v-for="sample in sampleReports" :key="sample.id" :value="sample.id">
            {{ sample.label }}
          </option>
        </select>
        <button class="button secondary" type="button" @click="openSample">Open sample now</button>
      </div>
    </section>

    <section>
      <p class="section-label">Endpoint</p>
      <div class="stack">
        <label>
          Endpoint
          <input v-model="settingsStore.baseUrl" class="input" type="text" />
        </label>
        <p class="muted">Use the vLLM server base URL or a proxy path like `/api/vllm`. The app adds `/v1` automatically.</p>
        <p class="muted">
          Active model:
          {{ settingsStore.modelId || 'Detected from /v1/models when extraction starts.' }}
        </p>
      </div>
    </section>

    <section>
      <p v-if="analysisStore.error" class="inline-error">{{ analysisStore.error }}</p>
    </section>
  </aside>
</template>
