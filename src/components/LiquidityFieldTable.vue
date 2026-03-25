<script setup lang="ts">
import type { ExtractedField, LiquidityFieldKey } from '../types/finance'

defineProps<{
  fields: ExtractedField[]
  selectedFieldKey: LiquidityFieldKey | null
}>()

defineEmits<{
  update: [key: LiquidityFieldKey, value: string]
  inspect: [key: LiquidityFieldKey]
}>()
</script>

<template>
  <section class="panel">
    <div class="panel-heading">
      <div>
        <p class="section-label">Normalized fields</p>
        <h2>Liquidity inputs extracted from statement pages</h2>
      </div>
    </div>

    <table class="field-table">
      <thead>
        <tr>
          <th>Field</th>
          <th>Value</th>
          <th>Confidence</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="field in fields"
          :key="field.key"
          :class="{ selected: selectedFieldKey === field.key }"
          @click="$emit('inspect', field.key)"
        >
          <td>
            <strong>{{ field.label }}</strong>
            <p class="cell-note">{{ field.rawModelLabel || 'Normalized line item' }}</p>
          </td>
          <td>
            <input
              class="table-input"
              :value="field.value ?? ''"
              inputmode="decimal"
              @input="$emit('update', field.key, ($event.target as HTMLInputElement).value)"
            />
          </td>
          <td>{{ Math.round(field.confidence * 100) }}%</td>
          <td><span class="badge subtle">{{ field.status }}</span></td>
        </tr>
      </tbody>
    </table>

    <div class="field-list-mobile">
      <article
        v-for="field in fields"
        :key="`${field.key}-mobile`"
        :class="['field-mobile-item', { selected: selectedFieldKey === field.key }]"
        @click="$emit('inspect', field.key)"
      >
        <div class="field-mobile-main">
          <div>
            <strong>{{ field.label }}</strong>
            <p class="cell-note">{{ field.rawModelLabel || 'Normalized line item' }}</p>
          </div>

          <label class="field-mobile-value" @click.stop>
            <span class="field-mobile-label">Value</span>
            <input
              class="table-input"
              :value="field.value ?? ''"
              inputmode="decimal"
              @input="$emit('update', field.key, ($event.target as HTMLInputElement).value)"
            />
          </label>
        </div>

        <div class="field-mobile-meta">
          <p class="field-mobile-meta-item">
            <span class="field-mobile-label">Confidence</span>
            <strong>{{ Math.round(field.confidence * 100) }}%</strong>
          </p>
          <div class="field-mobile-meta-item">
            <span class="field-mobile-label">Status</span>
            <span class="badge subtle">{{ field.status }}</span>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
