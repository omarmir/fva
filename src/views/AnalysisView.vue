<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CompanySummaryHeader from '../components/CompanySummaryHeader.vue'
import EvidenceInspector from '../components/EvidenceInspector.vue'
import LiquidityFieldTable from '../components/LiquidityFieldTable.vue'
import PageCandidateStrip from '../components/PageCandidateStrip.vue'
import ProgressOverview from '../components/ProgressOverview.vue'
import RatioResultsPanel from '../components/RatioResultsPanel.vue'
import SourceRail from '../components/SourceRail.vue'
import WarningBanner from '../components/WarningBanner.vue'
import { useAnalysisStore } from '../stores/analysis'
import { useReportStore } from '../stores/report'
import type { LiquidityFieldKey, PreviewPage } from '../types/finance'

const reportStore = useReportStore()
const analysisStore = useAnalysisStore()
const selectedPageNumber = ref<number | null>(null)
const selectedFieldKey = ref<LiquidityFieldKey | null>(null)
const previewPages = computed<PreviewPage[]>(() =>
  reportStore.candidatePages.length > 0 ? reportStore.candidatePages : reportStore.renderedPages.slice(0, 8),
)

watch(
  () => reportStore.candidatePages.length,
  () => {
    selectedPageNumber.value = previewPages.value[0]?.pageNumber ?? null
  },
  { immediate: true },
)

watch(
  () => reportStore.renderedPages.length,
  () => {
    if (previewPages.value.length === 0) {
      selectedPageNumber.value = null
      return
    }

    selectedPageNumber.value = previewPages.value[0]?.pageNumber ?? null
  },
  { immediate: true },
)

watch(
  () => analysisStore.extraction,
  (extraction) => {
    selectedFieldKey.value = extraction?.fields[0]?.key ?? null
  },
  { immediate: true },
)

const exportPayload = computed(() => analysisStore.exportJson())
</script>

<template>
  <main class="workspace">
    <SourceRail />

    <section class="main-column">
      <div class="panel workspace-intro">
        <div>
          <p class="section-label">Pipeline</p>
          <h2>Choose a PDF and the app takes over immediately</h2>
          <p class="muted">
            Upload or open a sample report. The app renders the pages, ranks likely statement pages in a
            worker, sends the candidate images to the local Qwen OCR model automatically, and presents
            the requested liquidity ratios.
          </p>
        </div>
      </div>

      <ProgressOverview :report-progress="reportStore.progress" :extraction-progress="analysisStore.progress" />

      <WarningBanner :warnings="analysisStore.warnings" />

      <PageCandidateStrip
        :pages="previewPages"
        :selected-page-number="selectedPageNumber"
        @select="selectedPageNumber = $event"
      />

      <CompanySummaryHeader
        v-if="analysisStore.extraction"
        :company-name="analysisStore.extraction.companyName"
        :fiscal-period-label="analysisStore.extraction.fiscalPeriodLabel"
        :period-end-date="analysisStore.extraction.periodEndDate"
        :sector="analysisStore.extraction.sector"
        :is-financial-institution="analysisStore.extraction.isFinancialInstitution"
      />

      <LiquidityFieldTable
        v-if="analysisStore.extraction"
        :fields="analysisStore.extraction.fields"
        :selected-field-key="selectedFieldKey"
        @inspect="selectedFieldKey = $event"
        @update="(key, value) => analysisStore.updateField(key, value)"
      />

      <RatioResultsPanel v-if="analysisStore.ratios.length" :ratios="analysisStore.ratios" />

      <section v-if="exportPayload" class="panel">
        <div class="panel-heading">
          <div>
            <p class="section-label">Export</p>
            <h2>Normalized JSON payload</h2>
          </div>
        </div>
        <pre class="export-block">{{ exportPayload }}</pre>
      </section>
    </section>

    <EvidenceInspector
      :extraction="analysisStore.extraction"
      :pages="previewPages"
      :selected-field-key="selectedFieldKey"
      :selected-page-number="selectedPageNumber"
    />
  </main>
</template>
