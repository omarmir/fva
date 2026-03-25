<script setup lang="ts">
import type { RatioResult } from '../types/finance'

defineProps<{
  ratios: RatioResult[]
}>()
</script>

<template>
  <section class="panel panel-tall">
    <div class="panel-heading">
      <div>
        <p class="section-label">Ratios</p>
        <h2>Liquidity view for the current reporting period</h2>
      </div>
    </div>

    <div class="ratio-grid">
      <article v-for="ratio in ratios" :key="ratio.key" class="ratio-tile">
        <p>{{ ratio.label }}</p>
        <strong>{{ ratio.value === null ? 'n/a' : ratio.value.toFixed(2) }}</strong>
        <span>{{ ratio.formulaText }}</span>
      </article>
    </div>
  </section>
</template>
