<script setup>
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import BeautifulModal from '@/components/BeautifulModal.vue';
</script>

<template>
  <router-view />
  <Toast />
  <ConfirmDialog />
  <BeautifulModal />
</template>