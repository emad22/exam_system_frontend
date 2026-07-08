<script setup>
import { useModal } from '@/composables/useModal';
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';
import AdminLayout from '@/components/AdminLayout.vue';
import Button from 'primevue/button';

const router = useRouter();
const { showAlert, showConfirm } = useModal();

const templates = ref([]);
const isLoading = ref(false);

const fetchTemplates = async () => {
    isLoading.value = true;
    try {
        const res = await api.get('/admin/certificate-templates');
        templates.value = res.data.data || res.data;
    } catch (err) {
        console.error('Failed to fetch templates', err);
    } finally {
        isLoading.value = false;
    }
};

onMounted(fetchTemplates);

const deleteTemplate = async (id) => {
    if (!(await showConfirm('Are you sure you want to delete this template?'))) return;
    try {
        await api.delete(`/admin/certificate-templates/${id}`);
        fetchTemplates();
    } catch (err) {
        showAlert('Failed to delete template.');
    }
};

const downloadSamplePdf = async (tpl) => {
    api.get(`/admin/certificate-templates/${tpl.id}/preview`, { responseType: 'blob' })
        .then(res => {
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = `Sample-${tpl.name}.pdf`;
            link.click();
        });
};
</script>

<template>
    <AdminLayout>
        <div class="p-6">
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h1 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Certificate Templates</h1>
                    <p class="text-slate-500 text-sm font-medium italic">Manage and edit certificate templates in dedicated pages.</p>
                </div>
                <Button label="Create Template" icon="pi pi-plus" @click="router.push({ name: 'admin.certificates.templates.create' })" class="p-button-sm p-button-raised" />
            </div>

            <div v-if="isLoading" class="flex justify-center py-20">
                <i class="pi pi-spin pi-spinner text-4xl text-slate-200"></i>
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div v-for="tpl in templates" :key="tpl.id"
                     class="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 group">
                    <div class="h-48 bg-slate-50 border-b border-slate-50 relative flex items-center justify-center p-4">
                        <div v-if="tpl.background_image" class="absolute inset-0 grayscale group-hover:grayscale-0 transition-all duration-700 opacity-20 group-hover:opacity-40">
                            <img :src="'/storage/' + tpl.background_image" class="w-full h-full object-cover" />
                        </div>
                        <div class="relative z-10 text-center">
                            <i class="pi pi-file-pdf text-4xl text-slate-200 group-hover:text-brand-primary/20 transition-colors"></i>
                            <p class="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-[0.2em]">{{ tpl.name }}</p>
                        </div>
                        <div v-if="tpl.is_default" class="absolute top-4 right-4 bg-emerald-500 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                            Default
                        </div>
                    </div>

                    <div class="p-6 flex justify-between items-center">
                        <div class="min-w-0 flex-grow">
                            <h4 class="text-xs font-black text-slate-800 uppercase tracking-tight truncate">{{ tpl.name }}</h4>
                            <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 italic">Last updated: {{ new Date(tpl.updated_at).toLocaleDateString() }}</p>
                        </div>
                        <div class="flex gap-1 shrink-0 ml-4">
                            <Button icon="pi pi-pencil" class="p-button-text p-button-sm p-button-rounded" @click="router.push({ name: 'admin.certificates.templates.edit', params: { id: tpl.id } })" />
                            <Button icon="pi pi-download" class="p-button-text p-button-sm p-button-rounded p-button-info" @click="downloadSamplePdf(tpl)" v-tooltip="'Download Sample PDF'" />
                            <Button icon="pi pi-trash" class="p-button-text p-button-sm p-button-rounded p-button-danger" @click="deleteTemplate(tpl.id)" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </AdminLayout>
</template>
