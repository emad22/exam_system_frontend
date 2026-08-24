<script setup>
import { watch, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import BeautifulModal from '@/components/BeautifulModal.vue';
import { registerToastListener } from '@/stores/notification';

const route = useRoute();
const toast = useToast();

let unregister = null;

onMounted(() => {
  unregister = registerToastListener((toastItem) => {
    toast.add({
      severity: toastItem.severity,
      summary: toastItem.summary,
      detail: toastItem.detail,
      life: toastItem.life ?? 4000,
    });
  });
});

onUnmounted(() => {
  if (unregister) unregister();
});

const forceAdminEnglish = () => {
  if (typeof window === 'undefined') return;

  const path = route.path || '';
  if (path.startsWith('/admin') || path.startsWith('/teacher')) {
    localStorage.setItem('dashboard_lang', 'en');
  }
};

watch(() => route.path, () => {
  forceAdminEnglish();
}, { immediate: true });
</script>

<template>
  <router-view />
  <Toast position="top-right" />
  <ConfirmDialog />
  <BeautifulModal />
</template>