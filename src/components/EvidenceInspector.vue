<script setup lang="ts">
import { computed } from 'vue'
import type { ExtractionResult, LiquidityFieldKey, PreviewPage } from '../types/finance'

const props = defineProps<{
  extraction: ExtractionResult | null
  selectedFieldKey: LiquidityFieldKey | null
  pages: PreviewPage[]
  selectedPageNumber: number | null
}>()

const selectedField = computed(() =>
  props.extraction?.fields.find((field) => field.key === props.selectedFieldKey) ?? null,
)

const selectedPage = computed(() =>
  props.pages.find((page) => page.pageNumber === props.selectedPageNumber) ?? null,
)
</script>

<template>
  <aside class="inspector">
    <section class="panel panel-tall">
      <p class="section-label">Evidence</p>
      <h2>{{ selectedField?.label || 'Inspect a field' }}</h2>

      <div v-if="selectedField" class="stack">
        <article v-for="citation in selectedField.citations" :key="`${citation.pageNumber}-${citation.snippet}`">
          <p class="citation-page">Page {{ citation.pageNumber }}</p>
          <p class="citation-snippet">{{ citation.snippet }}</p>
        </article>
        <p v-if="selectedField.citations.length === 0" class="muted">
          No citation returned for this field.
        </p>
      </div>

      <p v-else class="muted">Select a field to inspect the page evidence that produced it.</p>
    </section>

    <section class="panel preview-panel">
      <p class="section-label">Preview</p>
      <h2 v-if="selectedPage">Page {{ selectedPage.pageNumber }}</h2>
      <img
        v-if="selectedPage"
        :src="selectedPage.thumbnailDataUrl"
        :alt="`Preview of page ${selectedPage.pageNumber}`"
        class="preview-image"
      />
      <p v-else class="muted">Choose a candidate page to inspect the rendered statement image.</p>
    </section>
  </aside>
</template>
