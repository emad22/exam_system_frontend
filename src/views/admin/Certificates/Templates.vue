<script setup>
import { ref, onMounted } from 'vue';
import api from '@/services/api';
import AdminLayout from '@/components/AdminLayout.vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Checkbox from 'primevue/checkbox';
import Message from 'primevue/message';

const templates = ref([]);
const isLoading = ref(false);
const showModal = ref(false);
const isEditing = ref(false);
const currentTemplate = ref({
    name: '',
    content_html: '',
    is_default: false,
    background_image: null
});

const fetchTemplates = async () => {
    isLoading.value = true;
    try {
        const res = await api.get('/admin/certificate-templates');
        templates.value = res.data;
    } catch (err) {
        console.error('Failed to fetch templates', err);
    } finally {
        isLoading.value = false;
    }
};

onMounted(fetchTemplates);

const openCreateModal = () => {
    isEditing.value = false;
    currentTemplate.value = { name: '', content_html: '', is_default: false, background_image: null };
    showModal.value = true;
};

const openEditModal = (template) => {
    isEditing.value = true;
    currentTemplate.value = { ...template, is_default: !!template.is_default };
    showModal.value = true;
};

const handleFileUpload = (event) => {
    currentTemplate.value.background_image = event.target.files[0];
};

const saveTemplate = async () => {
    const formData = new FormData();
    formData.append('name', currentTemplate.value.name);
    formData.append('content_html', currentTemplate.value.content_html);
    formData.append('is_default', currentTemplate.value.is_default ? '1' : '0');
    
    if (currentTemplate.value.background_image instanceof File) {
        formData.append('background_image', currentTemplate.value.background_image);
    }

    try {
        if (isEditing.value) {
            formData.append('_method', 'PATCH');
            await api.post(`/admin/certificate-templates/${currentTemplate.value.id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        } else {
            await api.post('/admin/certificate-templates', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        }
        showModal.value = false;
        fetchTemplates();
    } catch (err) {
        console.error('Failed to save template', err);
        alert('Failed to save template. Please check the form data.');
    }
};

const deleteTemplate = async (id) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
        await api.delete(`/admin/certificate-templates/${id}`);
        fetchTemplates();
    } catch (err) {
        alert('Failed to delete template.');
    }
};

const downloadSamplePdf = (tpl) => {
    api.get(`/admin/certificate-templates/${tpl.id}/preview`, { responseType: 'blob' })
        .then(res => {
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = `Sample-${tpl.name}.pdf`;
            link.click();
        });
};

const generatePreviewHtml = () => {
    const content = currentTemplate.value.content_html || '<div style="text-align: center; margin-top: 100px; color: #94a3b8;">Type HTML to start preview...</div>';
    
    // Sample data for preview
    const sampleData = {
        '{name}': 'Abdulaziz Rustamov (Sample Student)',
        '{exam}': 'Arabic Language Proficiency Test (ALPT)',
        '{score}': '82.7',
        '{total_points}': '745',
        '{cefr}': 'C1.2',
        '{actfl}': 'Advanced High',
        '{date}': new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        '{number}': 'CERT-SAMPLE-001',
        '{verification_url}': '#',
        '{skills_table}': `
            <tr><td>Section: Composition</td><td>810/900</td><td>90.0%</td><td>C2</td><td>Superior</td><td>25 Aug. 2022</td></tr>
            <tr><td>Section: Speaking</td><td>680/900</td><td>75.6%</td><td>C1.1</td><td>Advanced Mid +</td><td>25 Aug. 2022</td></tr>
        `
    };

    let processedContent = content;
    Object.entries(sampleData).forEach(([key, val]) => {
        processedContent = processedContent.replace(new RegExp(key, 'g'), val);
    });

    let backgroundUrl = '';
    if (currentTemplate.value.background_image) {
        if (currentTemplate.value.background_image instanceof File) {
            backgroundUrl = URL.createObjectURL(currentTemplate.value.background_image);
        } else {
            backgroundUrl = '/storage/' + currentTemplate.value.background_image;
        }
    }

    return `
        <html>
        <head>
            <style>
                body { 
                    font-family: sans-serif; 
                    margin: 0; 
                    padding: 0;
                    background-image: url('${backgroundUrl}');
                    background-size: cover;
                    background-repeat: no-repeat;
                    width: 100%;
                    height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                }
                .container { width: 100%; padding: 40px; text-align: center; }
            </style>
        </head>
        <body>
            <div class="container">${processedContent}</div>
        </body>
        </html>
    `;
};
</script>

<template>
    <AdminLayout>
        <div class="p-6">
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h1 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Certificate Templates</h1>
                    <p class="text-slate-500 text-sm font-medium italic">Design and customize academic credentials using HTML and CSS.</p>
                </div>
                <Button label="Create Template" icon="pi pi-plus" @click="openCreateModal" class="p-button-sm p-button-raised" />
            </div>

            <div v-if="isLoading" class="flex justify-center py-20">
                <i class="pi pi-spin pi-spinner text-4xl text-slate-200"></i>
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div v-for="tpl in templates" :key="tpl.id" 
                     class="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 group">
                    
                    <!-- Preview Box -->
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

                    <!-- Footer -->
                    <div class="p-6 flex justify-between items-center">
                        <div class="min-w-0 flex-grow">
                            <h4 class="text-xs font-black text-slate-800 uppercase tracking-tight truncate">{{ tpl.name }}</h4>
                            <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 italic">Last updated: {{ new Date(tpl.updated_at).toLocaleDateString() }}</p>
                        </div>
                        <div class="flex gap-1 shrink-0 ml-4">
                            <Button icon="pi pi-pencil" class="p-button-text p-button-sm p-button-rounded" @click="openEditModal(tpl)" />
                            <Button icon="pi pi-download" class="p-button-text p-button-sm p-button-rounded p-button-info" @click="downloadSamplePdf(tpl)" v-tooltip="'Download Sample PDF'" />
                            <Button icon="pi pi-trash" class="p-button-text p-button-sm p-button-rounded p-button-danger" @click="deleteTemplate(tpl.id)" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Editor Modal -->
            <Dialog v-model:visible="showModal" :header="isEditing ? 'Edit Template' : 'Create Template'" 
                    modal class="w-full max-w-4xl rounded-[2.5rem] overflow-hidden" :breakpoints="{'960px': '75vw', '640px': '90vw'}">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
                    <!-- Left: Basic Info -->
                    <div class="space-y-6">
                        <div class="flex flex-col gap-2">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Template Name</label>
                            <InputText v-model="currentTemplate.name" placeholder="e.g. Executive Achievement Certificate" class="w-full" />
                        </div>

                        <div class="flex flex-col gap-2">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Background Image (Optional)</label>
                            <input type="file" @change="handleFileUpload" class="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
                            <p class="text-[9px] text-slate-400 italic">Recommended: 1123x794 (A4 Landscape)</p>
                        </div>

                        <div class="flex items-center gap-2 mt-4">
                            <Checkbox v-model="currentTemplate.is_default" :binary="true" inputId="is_default" />
                            <label for="is_default" class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Set as default for new issuances</label>
                        </div>

                        <Message severity="info" class="rounded-2xl mt-4" :closable="false">
                            <p class="text-[9px] font-bold leading-relaxed italic">
                                Available Placeholders: <br/>
                                <span class="text-brand-primary font-black">{name}, {exam}, {score}, {total_points}, {cefr}, {actfl}, {date}, {number}, {verification_url}, {skills_table}</span>
                            </p>
                        </Message>
                    </div>

                    <!-- Right: HTML Content & Preview -->
                    <div class="flex flex-col gap-6">
                        <div class="flex flex-col gap-2 h-1/2 min-h-[250px]">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">HTML Content</label>
                            <Textarea v-model="currentTemplate.content_html" class="flex-grow font-mono text-xs p-4 bg-slate-900 text-emerald-400 rounded-2xl border-none shadow-inner resize-none" placeholder="<div style='text-align: center;'>...</div>" />
                        </div>

                        <!-- Live Preview -->
                        <div class="flex flex-col gap-2 h-1/2 min-h-[300px]">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                Live Preview (A4 Landscape)
                                <span class="text-[8px] text-brand-primary lowercase font-bold tracking-normal italic">* Pre-rendered representation</span>
                            </label>
                            <div class="flex-grow bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-inner relative">
                                <iframe id="template-preview" 
                                        :srcdoc="generatePreviewHtml()"
                                        class="w-full h-full border-none pointer-events-none origin-top-left"
                                        style="transform: scale(1); width: 100%; height: 100%;">
                                </iframe>
                            </div>
                        </div>
                    </div>
                </div>

                <template #footer>
                    <div class="p-4 flex justify-end gap-3 bg-slate-50">
                        <Button label="Cancel" class="p-button-text p-button-sm font-black uppercase tracking-widest text-slate-400" @click="showModal = false" />
                        <Button label="Save Template" icon="pi pi-check" class="p-button-raised p-button-sm font-black uppercase tracking-widest" @click="saveTemplate" />
                    </div>
                </template>
            </Dialog>
        </div>
    </AdminLayout>
</template>

<style scoped>
:deep(.p-dialog-header) {
    padding: 1.5rem 2rem 1rem;
    background: #fff;
}
:deep(.p-dialog-content) {
    padding: 0;
}
:deep(.p-dialog-footer) {
    padding: 0;
    border-top: 1px solid #f1f5f9;
}
</style>
