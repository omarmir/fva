import { createRouter, createWebHistory } from 'vue-router'
import AnalysisView from '../views/AnalysisView.vue'
import MethodologyView from '../views/MethodologyView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'analysis', component: AnalysisView },
    { path: '/about', name: 'methodology', component: MethodologyView },
  ],
})

export default router
