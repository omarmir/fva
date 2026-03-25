<script setup lang="ts">
defineProps<{
  warnings: string[]
}>()
</script>

<template>
  <section v-if="warnings.length" class="warning-banner">
    <p class="section-label">Warnings</p>
    <ul>
      <li v-for="warning in warnings" :key="warning">{{ warning }}</li>
    </ul>
  </section>
</template>
