<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

const router = useRouter();

const selectedFiles = ref([]);
const fileInput = ref(null);
const isUploading = ref(false);
const uploadProgress = ref(0);
const successMessage = ref('');
const errorMessage = ref('');

const previewData = computed(() => {
    if (!selectedFiles.value.length) return null;
    
    // Process files to extract distinct exams, skills, and difficulties based on paths
    const exams = new Set();
    const skills = new Set();
    const levels = new Set();
    let txtCount = 0;

    selectedFiles.value.forEach(file => {
        const lowerName = file.name.toLowerCase();
        if (lowerName.startsWith('level') && lowerName.endsWith('.txt')) {
            const pathParts = file.webkitRelativePath.split('/');
            // Expecting exact match: exam1 / listening / level1.txt
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
        
        uploadProgress.value = 50;

        const response = await api.post('/admin/exams/import-folder', { files: payloadFiles }, {
            onUploadProgress: (progressEvent) => {
                // Approximate completion based on upload size
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                uploadProgress.value = 50 + (percentCompleted / 2);
            }
        });

        uploadProgress.value = 100;

        successMessage.value = response.data.message;
        selectedFiles.value = [];
        
        // Return to exams after short delay
        setTimeout(() => {
            router.push('/admin/exams');
        }, 4000);
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
</script>

<template>
  <AdminLayout>
    <div class="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
            <div class="flex items-center space-x-6">
                <router-link to="/admin/exams" class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-slate-400 hover:text-indigo-600 hover:shadow-md transition-all border border-slate-100 group">
                    <svg class="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7"/></svg>
                </router-link>
                <div>
                     <h1 class="text-3xl font-black text-slate-800 tracking-tight">Import Exams</h1>
                     <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Automatically build exams from folders</p>
                </div>
            </div>
            <button v-if="selectedFiles.length > 0 && !isUploading" @click="uploadFiles" class="bg-indigo-600 text-white font-black text-[10px] tracking-widest uppercase px-10 py-4 rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">
                START IMPORT ➜
            </button>
        </div>

        <!-- Main Workspace -->
        <div class="premium-card p-12 md:p-16">
            <div v-if="successMessage" class="mb-10 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-widest p-5 rounded-2xl flex items-center animate-in slide-in-from-top-2">
                 <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                 {{ successMessage }}
            </div>

            <div v-if="errorMessage" class="mb-10 bg-rose-50 border border-rose-100 text-rose-500 text-[10px] font-black uppercase tracking-widest p-5 rounded-2xl flex items-center animate-in slide-in-from-top-2">
                 <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                 {{ errorMessage }}
            </div>

            <div v-if="!selectedFiles.length" class="text-center group border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/30 rounded-[3rem] p-24 transition-all cursor-pointer" @click="triggerUpload">
                <input 
                    type="file" 
                    webkitdirectory 
                    directory 
                    multiple
                    ref="fileInput" 
                    @change="handleFolderSelect"
                    class="hidden"
                />
                <div class="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 text-5xl group-hover:rotate-12 transition-transform duration-500 shadow-sm text-indigo-500">📁</div>
                <h3 class="text-2xl font-black text-slate-700 mb-4 tracking-tight uppercase">Select Legacy Folder</h3>
                <p class="text-slate-400 font-medium max-w-sm mx-auto mb-10 text-xs leading-relaxed italic">
                    Choose a master folder (e.g. 'exam1') containing sub-folders for each skill ('listening', 'reading') with text files representing levels ('level1.txt').
                </p>
                <div class="inline-block bg-white border border-slate-200 text-slate-600 font-black py-4 px-10 rounded-2xl shadow-sm group-hover:shadow-md group-hover:text-indigo-600 transition uppercase tracking-widest text-[10px]">
                    Browse Files
                </div>
            </div>

            <div v-else class="space-y-10">
                <div class="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-10 relative overflow-hidden">
                     <div class="absolute -right-16 -top-16 w-32 h-32 bg-indigo-50 rounded-full blur-2xl"></div>
                     <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-8 relative z-10">Import Preview</h3>
                     
                     <div class="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
                         <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-50 text-center">
                              <div class="font-black text-slate-800 text-3xl mb-1 tracking-tighter">{{ previewData?.txtFiles || 0 }}</div>
                              <div class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">TXT Files Found</div>
                         </div>
                         <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-50 text-center">
                              <div class="font-black text-indigo-600 text-3xl mb-1 tracking-tighter">{{ previewData?.uniqueExams || 0 }}</div>
                              <div class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Exams (Tags)</div>
                         </div>
                         <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-50 text-center">
                              <div class="font-black text-emerald-600 text-3xl mb-1 tracking-tighter">{{ previewData?.uniqueSkills || 0 }}</div>
                              <div class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Skills</div>
                         </div>
                         <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-50 text-center">
                              <div class="font-black text-amber-500 text-3xl mb-1 tracking-tighter">{{ previewData?.uniqueLevels || 0 }}</div>
                              <div class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Difficulty Levels</div>
                         </div>
                     </div>

                     <div v-if="isUploading" class="mt-10 space-y-3">
                          <div class="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                               <span>Processing...</span>
                               <span>{{ uploadProgress }}%</span>
                          </div>
                          <div class="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                               <div class="bg-indigo-600 h-full transition-all duration-300 rounded-full" :style="`width: ${uploadProgress}%`"></div>
                          </div>
                     </div>
                     <div v-else class="mt-10 flex justify-end">
                          <button @click="cancelSelection" class="text-rose-500 hover:text-rose-600 text-[10px] font-black uppercase tracking-widest transition-colors py-2 px-4 hover:bg-rose-50 rounded-xl">
                              ✕ Cancel Selection
                          </button>
                     </div>
                </div>

                <div class="flex justify-center">
                     <p class="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] text-center max-w-lg leading-relaxed">
                         The system expects a format where each line is a question followed by options separated by tabs. The first option after the question will be marked as the correct answer.
                     </p>
                </div>
            </div>
        </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
