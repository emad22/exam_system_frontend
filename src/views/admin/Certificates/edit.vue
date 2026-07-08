<script setup>
import { useRoute } from 'vue-router';
import TemplateEditorPage from './TemplateEditorPage.vue';

const route = useRoute();
</script>

<template>
  <TemplateEditorPage mode="edit" :template-id="route.params.id" />
</template>
