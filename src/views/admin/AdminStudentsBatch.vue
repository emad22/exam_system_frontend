<script setup>
import { ref, computed } from 'vue';
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

const router = useRouter();
const fileInput = ref(null);
const selectedFile = ref(null);
const isUploading = ref(false);
const uploadErrors = ref([]);
const successMsg = ref('');
const step = ref(1); // 1: Select, 2: Process, 3: Result

const partners = ref([])
const partner_id = ref('')


const fetchPartners = async () => {
    try {
        const res = await api.get('/admin/partners/active')
        partners.value = res.data
    } catch (e) {
        console.error('Failed to load partners', e)
    }
}

onMounted(() => {
    fetchPartners()
})

const handleFileChange = (e) => {
    selectedFile.value = e.target.files[0];
    uploadErrors.value = [];
    successMsg.value = '';
    if (selectedFile.value) step.value = 1;
};

const triggerUpload = async () => {
    if (!selectedFile.value) return;

    step.value = 2;
    isUploading.value = true;
    uploadErrors.value = [];
    successMsg.value = '';

    const formData = new FormData();
    formData.append('file', selectedFile.value);

    formData.append('partner_id', partner_id.value); // 🔥 المهم

    try {
        const res = await api.post('/admin/students/batch', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        successMsg.value = res.data.message;
        step.value = 3;
    } catch (err) {
        console.error(err);
        if (err.response?.data?.errors) {
            uploadErrors.value = err.response.data.errors;
        } else {
            uploadErrors.value = [err.response?.data?.message || 'CRITICAL_IMPORT_FAILURE: System could not parse the provided data stream.'];
        }
        step.value = 3;
    } finally {
        isUploading.value = false;
    }
};

const reset = () => {
    step.value = 1;
    selectedFile.value = null;
    uploadErrors.value = [];
    partner_id.value = '';
    successMsg.value = '';
};
const downloadTemplate = async () => {
    try {
        const response = await api.get('/admin/students/template', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'student_import_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err) {
        console.error('Template download failed', err);
        alert('CRITICAL_TRANSFER_FAILURE: Could not retrieve the standardized template from the authority server.');
    }
};
</script>

<template>
    <AdminLayout>
        <div class="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">

            <!-- Header -->
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-6">
                    <router-link to="/admin/students"
                        class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-slate-400 hover:text-indigo-600 hover:shadow-md transition-all border border-slate-100 group">
                        <svg class="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none"
                            stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7" />
                        </svg>
                    </router-link>
                    <div>
                        <h1 class="text-3xl font-black text-slate-800 tracking-tight">Mass Identity Provisioning</h1>
                        <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Industrial Scale
                            Student Registration</p>
                    </div>
                </div>

                <!-- Wizard Steps indicator -->
                <div class="hidden md:flex items-center space-x-4">
                    <div v-for="s in [1, 2, 3]" :key="s"
                        :class="step >= s ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-400'"
                        class="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-500">
                        {{ s == 3 && uploadErrors.length > 0 && !successMsg ? '!' : s }}
                    </div>
                </div>
            </div>

            <div class="premium-card p-10 md:p-20 relative overflow-hidden">
                <!-- Background Decorative -->
                <div class="absolute -right-32 -bottom-32 w-80 h-80 bg-indigo-50/20 rounded-full blur-3xl"></div>



                <!-- Step 1: Selection -->
                <div v-if="step === 1" class="space-y-12 text-center animate-in zoom-in-95 duration-500">
                    <div class="space-y-4">
                        <div
                            class="w-24 h-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner">
                            <svg class="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        <h2 class="text-xl font-black text-slate-800 uppercase tracking-widest">Select Data Source</h2>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] max-w-sm mx-auto">
                            Upload .XLSX or .CSV following the standardized academy template.</p>
                    </div>

                    <div class="max-w-xl mx-auto text-left space-y-3">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Select Partner
                        </label>

                        <select v-model="partner_id"
                            class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500">

                            <option disabled value="">Choose Partner</option>
                            <option v-for="p in partners" :key="p.id" :value="p.id">
                                {{ p.partner_name }}
                            </option>
                        </select>
                    </div>



                    <div class="relative group max-w-xl mx-auto">
                        <input ref="fileInput" type="file" accept=".xlsx,.xls,.csv" @change="handleFileChange"
                            class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                        <div :class="selectedFile ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-200 bg-slate-50/50'"
                            class="border-4 border-dashed rounded-[3rem] p-16 transition-all duration-500 group-hover:border-indigo-400 group-hover:bg-indigo-50/10">

                            <div v-if="!selectedFile" class="space-y-2">
                                <span
                                    class="text-xs font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">Awaiting
                                    Payload...</span>
                                <p class="text-[9px] text-slate-300 font-bold uppercase tracking-widest mt-2 italic">
                                    Drag and drop authorized file format here</p>
                            </div>
                            <div v-else class="flex flex-col items-center animate-in slide-in-from-bottom-2">
                                <div
                                    class="px-6 py-3 bg-white rounded-2xl shadow-xl shadow-indigo-100/50 border border-indigo-100 flex items-center">
                                    <svg class="w-5 h-5 text-indigo-600 mr-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd"
                                            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                                            clip-rule="evenodd" />
                                    </svg>
                                    <span class="text-[10px] font-black text-slate-800 uppercase tracking-widest">{{
                                        selectedFile.name }}</span>
                                </div>
                                <button @click.stop="selectedFile = null"
                                    class="mt-6 text-[9px] font-black text-rose-400 hover:text-rose-600 uppercase tracking-widest transition-colors">Discard
                                    and Retry</button>
                            </div>
                        </div>
                    </div>

                    <div
                        class="pt-8 flex flex-col md:flex-row items-center justify-center space-y-6 md:space-y-0 md:space-x-10">
                        <button @click="downloadTemplate"
                            class="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:tracking-[0.2em] transition-all flex items-center group">
                            <svg class="w-4 h-4 mr-2 transform group-hover:translate-y-0.5 transition-transform"
                                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download Standard Template
                        </button>

                        <button @click="triggerUpload" :disabled="!selectedFile || !partner_id"
                            class="bg-indigo-600 text-white font-black py-4 px-12 rounded-[2rem] shadow-xl shadow-indigo-100 hover:shadow-indigo-300 transform hover:-translate-y-1 active:scale-95 transition-all duration-300 disabled:opacity-30 text-[10px] uppercase tracking-[0.3em]">
                            Initialize Provisioning ➜
                        </button>
                    </div>
                </div>

                <!-- Step 2: Processing -->
                <div v-else-if="step === 2" class="py-20 text-center space-y-12 animate-in zoom-in-95 duration-500">
                    <div class="relative w-40 h-40 mx-auto">
                        <!-- Loading Rings -->
                        <div class="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                        <div
                            class="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin">
                        </div>
                        <div
                            class="absolute inset-4 border-4 border-purple-200 rounded-full border-b-transparent animate-spin duration-[2s]">
                        </div>
                        <div class="absolute inset-0 flex items-center justify-center">
                            <span
                                class="text-[10px] font-black text-slate-800 uppercase tracking-widest animate-pulse">Syncing...</span>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <h2 class="text-2xl font-black text-slate-800 uppercase tracking-[0.2em]">Executing Batch
                            Command</h2>
                        <p
                            class="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-loose max-w-sm mx-auto italic">
                            Validating hash sums, auditing identity uniqueness, and committing database transactions. Do
                            not interrupt this session.</p>
                    </div>
                </div>

                <!-- Step 3: Result -->
                <div v-else-if="step === 3" class="space-y-12 animate-in slide-in-from-bottom-8 duration-700">

                    <div v-if="successMsg" class="text-center space-y-8">
                        <div
                            class="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-xl shadow-emerald-50">
                            <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3"
                                    d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div class="space-y-4">
                            <h2 class="text-3xl font-black text-slate-800 tracking-tight uppercase tracking-[0.1em]">
                                Provisioning Successful</h2>
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{{
                                successMsg }}</p>
                        </div>

                        <div
                            class="flex flex-col md:flex-row items-center justify-center pt-8 space-y-6 md:space-y-0 md:space-x-8">
                            <button @click="router.push('/admin/students')"
                                class="bg-indigo-600 text-white font-black py-4 px-12 rounded-[1.5rem] shadow-xl shadow-indigo-100 hover:shadow-indigo-300 transition-all text-[10px] uppercase tracking-widest">Return
                                to Fleet</button>
                            <button @click="reset"
                                class="text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-all">Import
                                Another Batch</button>
                        </div>
                    </div>

                    <div v-else class="space-y-10">
                        <div class="flex items-center space-x-6">
                            <div
                                class="w-16 h-16 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center shadow-lg shadow-rose-50 flex-shrink-0">
                                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3"
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <h2 class="text-xl font-black text-slate-800 uppercase tracking-widest">Provisioning
                                    Errors Detected</h2>
                                <p class="text-[10px] font-black text-rose-400 uppercase tracking-widest mt-1 italic">
                                    Identity conflicts or malformed data packets prevented completion.</p>
                            </div>
                        </div>

                        <div
                            class="bg-rose-50/50 rounded-[2rem] border border-rose-100 p-8 space-y-4 max-h-[300px] overflow-y-auto no-scrollbar">
                            <div v-for="(err, idx) in uploadErrors" :key="idx"
                                class="flex items-start space-x-4 p-4 bg-white rounded-2xl shadow-sm border border-rose-50">
                                <span
                                    class="w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 mt-0.5">{{
                                        idx + 1 }}</span>
                                <p
                                    class="text-[10px] font-black text-slate-700 uppercase tracking-widest leading-relaxed">
                                    {{ err }}</p>
                            </div>
                        </div>

                        <div class="text-center pt-8">
                            <button @click="reset"
                                class="bg-rose-500 text-white font-black py-4 px-12 rounded-[1.5rem] shadow-xl shadow-rose-100 hover:shadow-rose-300 transition-all text-[10px] uppercase tracking-widest">Resolve
                                and Re-Init</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </AdminLayout>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
</style>
