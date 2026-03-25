<script setup lang="ts">
import type { ProgressState } from '../types/finance'

defineProps<{
  reportProgress: ProgressState
  extractionProgress: ProgressState
}>()
</script>

<template>
  <section class="panel">
    <div class="panel-heading">
      <div>
        <p class="section-label">Progress</p>
        <h2>Document prep and OCR feedback</h2>
      </div>
    </div>

    <div class="progress-stack">
      <div class="progress-row">
        <div>
          <strong>Document processing</strong>
          <p class="muted">{{ reportProgress.message }}</p>
        </div>
        <span>{{ reportProgress.percent }}%</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: `${reportProgress.percent}%` }"></div>
      </div>

      <div class="progress-row">
        <div>
          <strong>OCR extraction</strong>
          <p class="muted">{{ extractionProgress.message }}</p>
        </div>
        <span>{{ extractionProgress.percent }}%</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill ink" :style="{ width: `${extractionProgress.percent}%` }"></div>
      </div>
    </div>
  </section>
</template>
