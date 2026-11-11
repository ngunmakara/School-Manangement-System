<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <div>
    <section class="ch-card">
      <div class="placeholder-panel not-found-panel">
        <span class="not-found-code" aria-hidden="true">404</span>
        <h2>This page could not be found</h2>
        <p>
          The address you opened does not match any CampusHub module. Use the navigation to return
          to a working section of the dashboard.
        </p>
        <div class="placeholder-actions">
          <RouterLink to="/dashboard" class="btn-ch btn-ch-primary">
            <i class="bi bi-grid-1x2" aria-hidden="true"></i>
            Go to dashboard
          </RouterLink>
          <RouterLink to="/students" class="btn-ch btn-ch-soft">
            <i class="bi bi-people" aria-hidden="true"></i>
            Open students
          </RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>
