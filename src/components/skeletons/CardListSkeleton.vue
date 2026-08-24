<script setup lang="ts">
import Skeleton from 'primevue/skeleton';

interface Props {
  rows?: number;
  showHeader?: boolean;
}
withDefaults(defineProps<Props>(), {
  rows: 6,
  showHeader: true,
});
</script>

<template>
  <div class="space-y-6 w-full animate-pulse">
    <!-- Page header -->
    <div v-if="showHeader" class="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-4">
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-3">
          <Skeleton width="2.5rem" height="2.5rem" borderRadius="0.75rem" />
          <div class="space-y-1.5">
            <Skeleton width="5rem" height="0.7rem" borderRadius="0.25rem" />
            <Skeleton width="9rem" height="1.4rem" borderRadius="0.5rem" />
          </div>
        </div>
        <div class="flex gap-2">
          <Skeleton width="9rem" height="2.25rem" borderRadius="0.75rem" />
          <Skeleton width="12rem" height="2.25rem" borderRadius="0.75rem" />
          <Skeleton width="2.25rem" height="2.25rem" borderRadius="0.75rem" />
        </div>
      </div>
    </div>

    <!-- Cards container -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <!-- Table-style header -->
      <div class="flex gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100">
        <Skeleton v-for="c in 5" :key="c" :width="c === 1 ? '40%' : '15%'" height="0.75rem" borderRadius="0.25rem" />
      </div>
      <!-- Rows -->
      <div class="divide-y divide-slate-50">
        <div v-for="row in rows" :key="row" class="flex items-center gap-4 px-6 py-4">
          <!-- Avatar + name -->
          <div class="flex items-center gap-3 flex-1">
            <Skeleton shape="circle" size="2.5rem" />
            <div class="space-y-1.5 min-w-0">
              <Skeleton width="65%" height="0.9rem" borderRadius="0.375rem" />
              <Skeleton width="45%" height="0.7rem" borderRadius="0.25rem" />
            </div>
          </div>
          <!-- Other cols -->
          <Skeleton v-for="c in 3" :key="c" :width="c === 2 ? '6rem' : '8rem'" height="1rem" borderRadius="0.375rem" class="flex-shrink-0" />
          <!-- Actions -->
          <div class="flex gap-2 flex-shrink-0">
            <Skeleton v-for="a in 2" :key="a" width="2rem" height="2rem" borderRadius="0.5rem" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
