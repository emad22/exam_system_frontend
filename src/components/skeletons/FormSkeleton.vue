<script setup lang="ts">
import Skeleton from 'primevue/skeleton';

interface Props {
  fieldsCount?: number;
}

withDefaults(defineProps<Props>(), {
  fieldsCount: 6
});
</script>

<template>
  <div class="space-y-6 w-full animate-pulse pb-16">
    <!-- Form Card Skeleton -->
    <div class="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-8 max-w-4xl mx-auto">
      <!-- Top Title -->
      <div class="space-y-2 pb-4 border-b border-slate-100">
        <Skeleton width="40%" height="2rem" borderRadius="0.5rem" />
        <Skeleton width="60%" height="1rem" borderRadius="0.375rem" />
      </div>

      <!-- Form Inputs Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div v-for="i in fieldsCount" :key="'field-' + i" class="space-y-2">
          <Skeleton width="30%" height="1rem" borderRadius="0.375rem" />
          <Skeleton width="100%" height="2.75rem" borderRadius="0.75rem" />
        </div>
      </div>

      <!-- Bottom Action Buttons -->
      <div class="flex justify-end gap-3 pt-6 border-t border-slate-100">
        <Skeleton width="6rem" height="2.75rem" borderRadius="0.75rem" />
        <Skeleton width="8rem" height="2.75rem" borderRadius="0.75rem" />
      </div>
    </div>
  </div>
</template>
