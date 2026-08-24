<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>

<template>
  <div class="space-y-8 w-full animate-pulse pb-16">
    <!-- Welcome Header Banner Skeleton -->
    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
      <div class="space-y-3 flex-1">
        <Skeleton width="10rem" height="1rem" borderRadius="0.5rem" />
        <Skeleton width="22rem" height="2.5rem" borderRadius="0.75rem" />
        <Skeleton width="16rem" height="1rem" borderRadius="0.5rem" />
      </div>
      <div class="flex items-center gap-3">
        <Skeleton width="8rem" height="2.75rem" borderRadius="0.75rem" />
      </div>
    </div>

    <!-- Stat Cards Grid Skeleton (4 cards) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <div v-for="i in 4" :key="'stat-' + i" class="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
        <div class="flex justify-between items-center">
          <Skeleton shape="circle" size="3rem" />
          <Skeleton width="4rem" height="1.5rem" borderRadius="1rem" />
        </div>
        <div class="space-y-2">
          <Skeleton width="50%" height="2rem" borderRadius="0.5rem" />
          <Skeleton width="70%" height="1rem" borderRadius="0.375rem" />
        </div>
      </div>
    </div>

    <!-- Secondary Grid: Activity Table & Live Session Skeletons -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Recent Activity Skeleton (2 cols) -->
      <div class="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
        <div class="flex justify-between items-center pb-3 border-b border-slate-100">
          <Skeleton width="12rem" height="1.5rem" borderRadius="0.5rem" />
          <Skeleton width="6rem" height="2rem" borderRadius="0.5rem" />
        </div>
        <div class="space-y-4">
          <div v-for="r in 5" :key="'act-' + r" class="flex items-center justify-between py-2 border-b border-slate-50 last:border-none">
            <div class="flex items-center gap-3 flex-1">
              <Skeleton shape="circle" size="2.5rem" />
              <div class="space-y-1.5 flex-1">
                <Skeleton width="60%" height="1rem" borderRadius="0.375rem" />
                <Skeleton width="40%" height="0.75rem" borderRadius="0.375rem" />
              </div>
            </div>
            <Skeleton width="5rem" height="1.5rem" borderRadius="0.75rem" />
          </div>
        </div>
      </div>

      <!-- Live Students Skeleton (1 col) -->
      <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
        <div class="flex justify-between items-center pb-3 border-b border-slate-100">
          <Skeleton width="10rem" height="1.5rem" borderRadius="0.5rem" />
          <Skeleton shape="circle" size="1.5rem" />
        </div>
        <div class="space-y-4">
          <div v-for="l in 4" :key="'live-' + l" class="p-4 rounded-xl border border-slate-50 bg-slate-50/50 space-y-3">
            <div class="flex items-center gap-3">
              <Skeleton shape="circle" size="2rem" />
              <div class="space-y-1 flex-1">
                <Skeleton width="70%" height="0.875rem" borderRadius="0.375rem" />
                <Skeleton width="45%" height="0.75rem" borderRadius="0.375rem" />
              </div>
            </div>
            <Skeleton width="100%" height="0.5rem" borderRadius="0.25rem" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
