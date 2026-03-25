<script setup lang="ts">
defineProps<{
  companyName: string
  fiscalPeriodLabel: string
  sector?: string
  periodEndDate?: string
  isFinancialInstitution: boolean
}>()
</script>

<template>
  <section class="hero-panel">
    <div>
      <p class="section-label">Selected company</p>
      <h2>{{ companyName }}</h2>
      <p class="hero-copy">
        {{ fiscalPeriodLabel }}
        <span v-if="periodEndDate"> · period end {{ periodEndDate }}</span>
        <span v-if="sector"> · {{ sector }}</span>
      </p>
    </div>

    <p :class="['badge', isFinancialInstitution ? 'warn' : 'ok']">
      {{ isFinancialInstitution ? 'Financial institution' : 'Operating company' }}
    </p>
  </section>
</template>
