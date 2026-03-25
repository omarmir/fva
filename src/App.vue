<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div>
        <p class="eyebrow">Financial Vision Analyzer</p>
        <h1>Liquidity ratios from statement pages.</h1>
      </div>

      <nav class="topnav" aria-label="Primary">
        <RouterLink :class="{ active: route.name === 'analysis' }" to="/">Workspace</RouterLink>
        <RouterLink :class="{ active: route.name === 'methodology' }" to="/about">
          Methodology
        </RouterLink>
      </nav>
    </header>

    <RouterView />
  </div>
</template>
