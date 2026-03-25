<script setup lang="ts">
import type { PreviewPage } from '../types/finance'

defineProps<{
  pages: PreviewPage[]
  selectedPageNumber: number | null
}>()

defineEmits<{
  select: [pageNumber: number]
}>()
</script>

<template>
  <section class="panel">
    <div class="panel-heading">
    <div>
        <p class="section-label">Page images</p>
        <h2>Rendered immediately, then shortlisted for OCR</h2>
      </div>
    </div>

    <div class="thumb-grid">
      <button
        v-for="page in pages"
        :key="page.pageNumber"
        :class="['thumb', { active: page.pageNumber === selectedPageNumber }]"
        type="button"
        @click="$emit('select', page.pageNumber)"
      >
        <img :src="page.thumbnailDataUrl" :alt="`Page ${page.pageNumber}`" loading="lazy" />
        <strong>Page {{ page.pageNumber }}</strong>
        <span>{{ page.score === undefined ? 'Preview ready' : `Score ${page.score}` }}</span>
      </button>
    </div>
  </section>
</template>
