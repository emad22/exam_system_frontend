<script setup>
import { watch } from 'vue';
import { useRoute } from 'vue-router';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import BeautifulModal from '@/components/BeautifulModal.vue';

const route = useRoute();

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
  <Toast />
  <ConfirmDialog />
  <BeautifulModal />
</template>