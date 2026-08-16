<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

import Select from 'primevue/select';
import Button from 'primevue/button';
import Message from 'primevue/message';
import ProgressBar from 'primevue/progressbar';

const router = useRouter();

const selectedFiles = ref([]);
const fileInput = ref(null);
const isUploading = ref(false);
const uploadProgress = ref(0);
const successMessage = ref('');
const errorMessage = ref('');

const categories = ref([]);
const selectedCategory = ref(null);
const isLoadingCategories = ref(true);

const fetchCategories = async () => {
    try {
        const res = await api.get('/admin/exam-categories');
        categories.value = res.data;
        if (categories.value.length > 0) {
            selectedCategory.value = categories.value[0].id;
        }
    } catch (err) {
        console.error('Failed to load categories', err);
    } finally {
        isLoadingCategories.value = false;
    }
};

const previewData = computed(() => {
    if (!selectedFiles.value.length) return null;
    
    const exams = new Set();
    const skills = new Set();
    const levels = new Set();
    let txtCount = 0;

    selectedFiles.value.forEach(file => {
        const lowerName = file.name.toLowerCase();
        if (lowerName.startsWith('level') && lowerName.endsWith('.txt')) {
            const pathParts = file.webkitRelativePath.split('/');
            if (pathParts.length === 3) {
                txtCount++;
                exams.add(pathParts[0]);
                skills.add(pathParts[1]);
                levels.add(pathParts[2]);
            }
        }
    });

    return {
        totalFiles: selectedFiles.value.length,
        txtFiles: txtCount,
        uniqueExams: exams.size,
        uniqueSkills: skills.size,
        uniqueLevels: levels.size
    };
});

const handleFolderSelect = (event) => {
    selectedFiles.value = Array.from(event.target.files);
    successMessage.value = '';
    errorMessage.value = '';
};

const triggerUpload = () => {
    fileInput.value.click();
};

const uploadFiles = async () => {
    if (!selectedFiles.value.length) return;

    isUploading.value = true;
    errorMessage.value = '';
    successMessage.value = '';
    uploadProgress.value = 0;

    try {
        uploadProgress.value = 10;
        const payloadFiles = [];
        
        for (const file of selectedFiles.value) {
            const lowerName = file.name.toLowerCase();
            if (lowerName.startsWith('level') && lowerName.endsWith('.txt')) {
                const pathParts = file.webkitRelativePath.split('/');
                if (pathParts.length === 3) {
                    try {
                        const text = await file.text();
                        if (text && text.trim().length > 0) {
                            payloadFiles.push({
                                examName: pathParts[0],
                                skillName: pathParts[1],
                                fileName: pathParts[2],
                                content: text
                            });
                        }
                    } catch (e) {
                        console.warn(`Failed to read file ${file.name}`, e);
                    }
                }
            }
        }
        
        uploadProgress.value = 40;

        const response = await api.post('/admin/exams/import-folder', { 
            files: payloadFiles,
            exam_category_id: selectedCategory.value 
        });

        uploadProgress.value = 100;
        successMessage.value = response.data.message;
        selectedFiles.value = [];
        
        setTimeout(() => {
            router.push('/admin/exams');
        }, 3000);
    } catch (err) {
         console.error('Upload failed:', err);
         errorMessage.value = err.response?.data?.message || 'Error occurred while importing the files.';
    } finally {
         isUploading.value = false;
    }
};

const cancelSelection = () => {
    selectedFiles.value = [];
    fileInput.value.value = '';
    successMessage.value = '';
    errorMessage.value = '';
};

onMounted(fetchCategories);
</script>

<template>
  <AdminLayout>
    <div class="max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-24 mt-8 px-4 md:px-12">
        
        <!-- Premium Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8 md:space-y-0">
            <div class="flex items-center space-x-6">
                <router-link to="/admin/exams" class="w-14 h-14 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-400 hover:text-brand-primary hover:bg-rose-50 transition-all border border-slate-100 group">
                    <i class="pi pi-arrow-left text-xl transform group-hover:-translate-x-1 transition-transform"></i>
                </router-link>
                <div>
                     <h1 class="text-3xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Batch Processor</h1>
                     <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Automated Multi-Skill Asset Migration</p>
                </div>
            </div>
            
            <div v-if="selectedFiles.length > 0 && !isUploading" class="flex items-center space-x-6">
                <div class="flex flex-col items-end">
                    <span class="text-[9px] font-black text-slate-300 uppercase tracking-widest">Active Tier</span>
                    <span class="text-xs font-black text-slate-800 uppercase tracking-tight">Ready for Sync</span>
                </div>
                <Button label="START INGESTION" icon="pi pi-bolt" class="bg-brand-primary border-none text-[10px] font-black uppercase tracking-widest px-10 py-4 shadow-lg shadow-rose-100 transition-all hover:-translate-y-1" @click="uploadFiles" />
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            <!-- Structural Blueprint (Guide) -->
            <div class="lg:col-span-4 space-y-8">
                <div class="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
                    <div class="flex items-center space-x-4">
                        <div class="w-10 h-10 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                            <i class="pi pi-map"></i>
                        </div>
                        <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">Asset Protocol</h3>
                    </div>

                    <div class="space-y-6">
                        <div class="p-6 bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden group">
                           <div class="absolute right-0 top-0 w-1 h-full bg-brand-primary opacity-20"></div>
                           <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Folder Hierarchy</p>
                           <div class="font-mono text-[10px] space-y-2 text-slate-600">
                               <div class="flex items-center space-x-2"><i class="pi pi-folder text-brand-accent"></i> <span>Master_Exam/</span></div>
                               <div class="flex items-center space-x-2 ml-4"><i class="pi pi-folder text-brand-primary"></i> <span>Listening/</span></div>
                               <div class="flex items-center space-x-2 ml-8"><i class="pi pi-file text-slate-400"></i> <span>level1.txt</span></div>
                               <div class="flex items-center space-x-2 ml-8"><i class="pi pi-file text-slate-400"></i> <span>level2.txt</span></div>
                               <div class="flex items-center space-x-2 ml-4"><i class="pi pi-folder text-brand-primary"></i> <span>Reading/</span></div>
                           </div>
                        </div>

                        <div class="space-y-3">
                             <h4 class="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center">
                                 <i class="pi pi-info-circle mr-2 text-brand-accent"></i> FILE FORMAT
                             </h4>
                             <p class="text-[10px] text-slate-400 font-bold leading-relaxed tracking-wider uppercase opacity-80 italic">
                                Lines must use [TAB] or [3+ SPACES] between question and options. First option is marked CORRECT.
                             </p>
                        </div>
                    </div>
                </div>

                <!-- Category Target Selector -->
                <div class="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                    <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider">Classification Target</h3>
                    <div class="space-y-4">
                        <Select v-model="selectedCategory" :options="categories" optionLabel="name" optionValue="id" 
                            placeholder="Select Domain Classification" :loading="isLoadingCategories"
                            class="w-full rounded-2xl border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase tracking-widest p-1" />
                        <p class="text-[9px] text-slate-300 font-black uppercase tracking-widest text-center px-4">
                            All imported templates will be mapped to this institutional domain.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Migration Workspace -->
            <div class="lg:col-span-8 space-y-8">
                <div class="bg-white p-10 md:p-16 rounded-[4rem] border border-slate-100 shadow-sm min-h-[500px] flex flex-col justify-center relative overflow-hidden">
                    <div class="absolute -right-32 -bottom-32 w-96 h-96 bg-slate-50/50 rounded-full blur-3xl"></div>

                    <div v-if="successMessage" class="mb-10">
                        <Message severity="success" class="rounded-3xl border-none shadow-sm shadow-emerald-50">
                            <template #message>
                                <span class="text-[10px] font-black uppercase tracking-widest p-4 block text-emerald-600">{{ successMessage }}</span>
                            </template>
                        </Message>
                    </div>

                    <div v-if="errorMessage" class="mb-10">
                        <Message severity="error" class="rounded-3xl border-none shadow-sm shadow-rose-50">
                            <template #message>
                                <span class="text-[10px] font-black uppercase tracking-widest p-4 block text-rose-500">{{ errorMessage }}</span>
                            </template>
                        </Message>
                    </div>

                    <!-- Dropzone -->
                    <div v-if="!selectedFiles.length" @click="triggerUpload" 
                        class="group p-20 border-2 border-dashed border-slate-100 bg-slate-50/30 rounded-[4rem] flex flex-col items-center justify-center text-center cursor-pointer hover:bg-rose-50/30 hover:border-brand-primary/20 transition-all duration-700 active:scale-[0.98]">
                        <input type="file" webkitdirectory directory multiple ref="fileInput" @change="handleFolderSelect" class="hidden" />
                        
                        <div class="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 text-5xl shadow-sm text-brand-accent group-hover:rotate-12 transition-transform duration-500 italic">ðŸ“ </div>
                         <h3 class="text-2xl font-black text-slate-800 mb-4 tracking-tighter uppercase leading-none">Import Exams</h3>
                         <p class="text-slate-400 font-bold max-w-sm mx-auto mb-10 text-[10px] leading-relaxed uppercase tracking-[0.2em] opacity-60">
                             Select the folder containing the exam template files.
                         </p>
                        
                        <div class="bg-white border border-slate-100 text-slate-700 font-black py-5 px-12 rounded-3xl shadow-sm group-hover:shadow-2xl group-hover:text-brand-primary transition-all duration-500 uppercase tracking-widest text-[10px]">
                            SELECT MASTER FOLDER
                        </div>
                    </div>

                    <!-- Selection Preview -->
                    <div v-else class="space-y-12">
                        <div class="bg-slate-50/80 border border-slate-100 rounded-[3.5rem] p-12 relative overflow-hidden">
                             <div class="absolute -right-24 -top-24 w-64 h-64 bg-brand-primary/5 rounded-full blur-[80px]"></div>
                             <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-10 relative z-10">Ingestion Telemetry</h3>
                             
                             <div class="grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
                                 <div class="bg-white p-8 rounded-3xl shadow-sm border border-slate-50 text-center space-y-2">
                                      <div class="font-black text-slate-800 text-4xl tracking-tighter leading-none">{{ previewData?.txtFiles || 0 }}</div>
                                      <div class="text-[8px] font-black text-slate-300 uppercase tracking-widest">Logic Units</div>
                                 </div>
                                 <div class="bg-white p-8 rounded-3xl shadow-sm border border-slate-50 text-center space-y-2">
                                      <div class="font-black text-brand-primary text-4xl tracking-tighter leading-none">{{ previewData?.uniqueExams || 0 }}</div>
                                      <div class="text-[8px] font-black text-slate-300 uppercase tracking-widest">Identified</div>
                                 </div>
                                 <div class="bg-white p-8 rounded-3xl shadow-sm border border-slate-50 text-center space-y-2">
                                      <div class="font-black text-emerald-600 text-4xl tracking-tighter leading-none">{{ previewData?.uniqueSkills || 0 }}</div>
                                      <div class="text-[8px] font-black text-slate-300 uppercase tracking-widest">Domains</div>
                                 </div>
                                 <div class="bg-white p-8 rounded-3xl shadow-sm border border-slate-50 text-center space-y-2">
                                      <div class="font-black text-amber-500 text-4xl tracking-tighter leading-none">{{ previewData?.uniqueLevels || 0 }}</div>
                                      <div class="text-[8px] font-black text-slate-300 uppercase tracking-widest">Tiers</div>
                                 </div>
                             </div>

                             <div v-if="isUploading" class="mt-12 space-y-4">
                                  <div class="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                       <span>Importing data...</span>
                                       <span>{{ uploadProgress }}%</span>
                                  </div>
                                  <ProgressBar :value="uploadProgress" :showValue="false" class="h-3 bg-slate-200" />
                             </div>

                             <div v-else class="mt-12 flex justify-center">
                                  <Button label="Discard Selection" icon="pi pi-trash" text severity="danger" class="text-[10px] font-black uppercase tracking-widest px-8" @click="cancelSelection" />
                             </div>
                        </div>

                        <div class="text-center">
                             <p class="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] max-w-lg mx-auto leading-relaxed italic">
                                 Exam data will be imported based on the identified skills and levels.
                             </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.premium-card {
    background: white;
    border-radius: 4rem;
    box-shadow: 0 32px 120px rgba(0,0,0,0.02);
    border: 1px solid #f1f5f9;
}
:deep(.p-select) {
    background: transparent !important;
    border: none !important;
}
:deep(.p-select-label) {
    font-size: 10px !important;
    font-weight: 900 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.1em !important;
}
:deep(.p-progressbar) {
    border-radius: 1rem;
    overflow: hidden;
}
:deep(.p-progressbar-value) {
    background: #7c2d12 !important; /* brand-primary */
}
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
</style>
