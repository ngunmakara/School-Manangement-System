<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import PageHeader from '../components/common/PageHeader.vue'

const route = useRoute()

const title = computed(() => route.meta.title || 'Module')
const description = computed(() => route.meta.description || 'This module is planned for a later milestone.')
const icon = computed(() => route.meta.icon || 'bi-grid')
const milestone = computed(() => route.meta.milestone || 2)
const features = computed(() => route.meta.features || [])
const requestedAction = computed(() => route.query.action)

const actionLabel = computed(() => {
  if (requestedAction.value === 'add') return 'add'
  if (requestedAction.value === 'edit') return 'edit'
  return ''
})
</script>

<template>
  <div>
    <PageHeader
      :title="title"
      :description="description"
      eyebrow="Planned module"
      eyebrow-icon="bi-signpost-split"
    >
      <template #actions>
        <span class="demo-flag">
          <i class="bi bi-tools" aria-hidden="true"></i>
          Milestone {{ milestone }}
        </span>
      </template>
    </PageHeader>

    <section class="ch-card">
      <div class="placeholder-panel">
        <span class="placeholder-icon" aria-hidden="true">
          <i class="bi" :class="icon"></i>
        </span>
        <h2>{{ title }} is scheduled for Milestone {{ milestone }}</h2>
        <p>
          The navigation route is live, so nothing is broken. The full {{ title.toLowerCase() }}
          interface — including local CRUD, filters, and persistence — will be built in the next
          milestone of this frontend project.
        </p>
        <p v-if="actionLabel" class="placeholder-note">
          <i class="bi bi-info-circle" aria-hidden="true"></i>
          The “{{ actionLabel }}” action you requested will open a validated form once this module
          is implemented.
        </p>

        <div v-if="features.length" class="placeholder-features">
          <span v-for="feature in features" :key="feature" class="placeholder-chip">
            <i class="bi bi-check2" aria-hidden="true"></i>
            {{ feature }}
          </span>
        </div>

        <div class="placeholder-actions">
          <RouterLink to="/dashboard" class="btn-ch btn-ch-primary">
            <i class="bi bi-arrow-left" aria-hidden="true"></i>
            Back to dashboard
          </RouterLink>
        </div>

        <p class="placeholder-footnote">
          <i class="bi bi-shield-exclamation" aria-hidden="true"></i>
          Frontend-only demo: no backend, database, or authentication server is connected yet.
        </p>
      </div>
    </section>
  </div>
</template>
