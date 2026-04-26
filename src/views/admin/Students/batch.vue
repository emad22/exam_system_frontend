<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

import Card from 'primevue/card';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Message from 'primevue/message';
import FileUpload from 'primevue/fileupload';
import Checkbox from 'primevue/checkbox';
import ProgressSpinner from 'primevue/progressspinner';

const router = useRouter();
const fileInput = ref(null);
const selectedFile = ref(null);
const isUploading = ref(false);
const uploadErrors = ref([]);
const successMsg = ref('');
const step = ref(1); // 1: Select, 2: Process, 3: Result

const partners = ref([])
const partner_id = ref('')

const packages = ref([])
const package_id = ref(null)
const skills = ref([])
const assigned_skills = ref([])


const fetchData = async () => {
    try {
        const [pRes, pkgRes, sRes] = await Promise.all([
            api.get('/admin/partners/active'),
            api.get('/admin/packages'),
            api.get('/admin/skills')
        ])
        partners.value = pRes.data
        packages.value = pkgRes.data
        skills.value = sRes.data
    } catch (e) {
        console.error('Failed to load batch prerequisites', e)
    }
}

onMounted(() => {
    fetchData()
})

const onFileSelect = (e) => {
    selectedFile.value = e.files ? e.files[0] : null;
    uploadErrors.value = [];
    successMsg.value = '';
    if (selectedFile.value) step.value = 1;
};

const removeFile = () => {
    selectedFile.value = null;
};

const triggerUpload = async () => {
    if (!selectedFile.value) return;

    step.value = 2;
    isUploading.value = true;
    uploadErrors.value = [];
    successMsg.value = '';

    const formData = new FormData();
    formData.append('file', selectedFile.value);

    formData.append('partner_id', partner_id.value); 
    if (package_id.value) formData.append('package_id', package_id.value);
    if (assigned_skills.value.length > 0) {
        formData.append('assigned_skills', JSON.stringify(assigned_skills.value));
    }

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
    package_id.value = null;
    assigned_skills.value = [];
    successMsg.value = '';
};
// Watch package selection to sync skills
watch(package_id, (newVal) => {
    if (newVal && newVal !== 4) { // 4 is Custom Pack
        const pkg = packages.value.find(p => p.id === newVal)
        if (pkg && pkg.skills) {
            assigned_skills.value = [...pkg.skills]
        }
    }
})

// Watch manual skill changes to switch to Custom Pack
watch(assigned_skills, (newVal) => {
    if (package_id.value && package_id.value !== 4) {
        const pkg = packages.value.find(p => p.id === package_id.value)
        if (pkg && pkg.skills) {
            const current = [...newVal].sort().join(',')
            const target = [...pkg.skills].sort().join(',')
            if (current !== target) {
                package_id.value = 4 // Switch to Custom Pack
            }
        }
    }
}, { deep: true })

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
        <div class="max-w-5xl mx-auto space-y-6">

            <!-- Header -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <i class="pi pi-cloud-upload text-brand-accent"></i>
                        Batch Student Import
                    </h1>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 ml-10">Upload Student Roster Automatically</p>
                </div>
            </div>

            <Card class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden mt-6">
                <template #content>
                    <div class="p-4 md:p-10">

                        <!-- Step 1: Selection -->
                        <div v-if="step === 1" class="space-y-10 animate-in fade-in duration-500">
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                                <!-- Partner Selection -->
                                <div class="space-y-4 shadow-sm border border-slate-100 p-6 rounded-3xl bg-white">
                                    <div class="flex items-center gap-3 mb-2">
                                        <div class="w-8 h-8 rounded-lg bg-brand-primary text-white flex items-center justify-center">
                                            <i class="pi pi-users text-xs"></i>
                                        </div>
                                        <label class="text-xs font-black text-slate-800 uppercase tracking-widest pl-2">1. Select Target Partner</label>
                                    </div>
                                    <Select 
                                        v-model="partner_id" 
                                        :options="partners" 
                                        optionLabel="partner_name" 
                                        optionValue="id"
                                        placeholder="Choose a partner..." 
                                        class="w-full rounded-xl"
                                    />
                                </div>

                                <!-- Package Selection -->
                                <div class="space-y-4 shadow-sm border border-slate-100 p-6 rounded-3xl bg-white">
                                    <div class="flex items-center gap-3 mb-2">
                                        <div class="w-8 h-8 rounded-lg bg-brand-primary text-white flex items-center justify-center">
                                            <i class="pi pi-box text-xs"></i>
                                        </div>
                                        <label class="text-xs font-black text-slate-800 uppercase tracking-widest pl-2">2. Global Package Selection</label>
                                    </div>
                                    <Select 
                                        v-model="package_id" 
                                        :options="packages" 
                                        optionLabel="name" 
                                        optionValue="id"
                                        placeholder="Select a package..." 
                                        class="w-full rounded-xl"
                                    />
                                </div>
                            </div>

                            <!-- Skill Overrides -->
                            <div class="max-w-4xl mx-auto space-y-4 shadow-sm border border-slate-100 p-8 rounded-3xl bg-white">
                                <div class="flex items-center justify-between mb-4">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-lg bg-brand-primary text-white flex items-center justify-center">
                                            <i class="pi pi-verified text-xs"></i>
                                        </div>
                                        <label class="text-xs font-black text-slate-800 uppercase tracking-widest pl-2">3. Global Skill Selection (Override)</label>
                                    </div>
                                    <span class="text-[9px] font-black text-brand-primary uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-lg">Apply to all Students</span>
                                </div>
                                <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
                                    <label v-for="skill in skills" :key="skill.id" 
                                        :class="assigned_skills.includes(skill.short_code) ? 'border-brand-primary bg-rose-50/30' : 'border-slate-100 bg-slate-50'"
                                        class="flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer hover:border-indigo-200">
                                        <Checkbox :value="skill.short_code" v-model="assigned_skills" />
                                        <span class="mt-2 text-[10px] font-black text-slate-700 uppercase tracking-tighter">
                                            {{ skill.name }}
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <!-- File Selection using PrimeVue -->
                            <div class="max-w-xl mx-auto space-y-2 mt-8">
                                <label class="text-xs font-black text-slate-500 uppercase tracking-widest pl-2 text-center block">4. Provide Excel/CSV Data Source</label>
                                
                                <div class="border-2 border-dashed border-slate-200 bg-slate-50 rounded-3xl p-8 flex flex-col items-center justify-center transition-colors hover:border-indigo-300">
                                    <template v-if="!selectedFile">
                                        <i class="pi pi-file-excel text-4xl text-slate-300 mb-4"></i>
                                        <p class="text-xs font-bold text-slate-500 mb-4">Select a standardized data template</p>
                                        <FileUpload mode="basic" accept=".xlsx,.xls,.csv" :maxFileSize="10000000" @select="onFileSelect" chooseLabel="Browse Files" />
                                    </template>
                                    <template v-else>
                                        <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center w-full max-w-sm mb-4">
                                            <i class="pi pi-file text-brand-accent text-2xl mr-4"></i>
                                            <div class="flex-1 overflow-hidden">
                                                <p class="text-sm font-bold text-slate-700 truncate">{{ selectedFile.name }}</p>
                                                <p class="text-[10px] uppercase font-bold text-slate-400 mt-1">{{ (selectedFile.size / 1024).toFixed(1) }} KB</p>
                                            </div>
                                            <Button icon="pi pi-times" severity="danger" text rounded aria-label="Remove" @click="removeFile" />
                                        </div>
                                    </template>
                                </div>
                            </div>

                            <!-- Actions -->
                            <div class="flex flex-col md:flex-row items-center justify-center gap-6 pt-6">
                                <Button label="Download Template" icon="pi pi-download" severity="secondary" text @click="downloadTemplate" class="font-bold text-xs" />
                                <Button label="Initialize Import" icon="pi pi-arrow-right" iconPos="right" @click="triggerUpload" :disabled="!selectedFile || !partner_id" class="px-8 font-bold overflow-hidden" raised />
                            </div>
                        </div>

                        <!-- Step 2: Processing -->
                        <div v-else-if="step === 2" class="py-20 text-center space-y-8 animate-in zoom-in-95 duration-500">
                            <ProgressSpinner style="width: 80px; height: 80px" strokeWidth="4" animationDuration=".8s" />
                            <div>
                                <h2 class="text-xl font-black text-slate-800 tracking-wide mb-2">Processing Data Source...</h2>
                                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest leading-loose">Validating structure and importing identities concurrently.</p>
                            </div>
                        </div>

                        <!-- Step 3: Result -->
                        <div v-else-if="step === 3" class="space-y-10 animate-in slide-in-from-bottom-8 duration-700">

                            <!-- Success State -->
                            <div v-if="successMsg" class="text-center space-y-8 py-10">
                                <i class="pi pi-check-circle text-emerald-500" style="font-size: 5rem"></i>
                                <div class="space-y-4">
                                    <h2 class="text-3xl font-black text-slate-800 tracking-tight">Provisioning Complete</h2>
                                    <p class="text-sm font-bold text-emerald-600">{{ successMsg }}</p>
                                </div>
                                <div class="flex justify-center gap-4 pt-4">
                                    <Button label="Return to Directory" icon="pi pi-list" @click="router.push('/admin/students')" rounded />
                                    <Button label="Import Another" icon="pi pi-refresh" severity="secondary" @click="reset" rounded />
                                </div>
                            </div>

                            <!-- Error State -->
                            <div v-else class="space-y-8">
                                <div class="flex items-center gap-6 bg-rose-50 p-6 rounded-3xl border border-rose-100">
                                    <div class="w-16 h-16 bg-white rounded-2xl shadow-sm text-rose-500 flex items-center justify-center flex-shrink-0">
                                        <i class="pi pi-exclamation-triangle text-3xl"></i>
                                    </div>
                                    <div>
                                        <h2 class="text-xl font-black text-slate-800">Errors Detected</h2>
                                        <p class="text-[10px] font-black text-rose-500 uppercase tracking-widest mt-1">Rectify the issues below and retry the procedure.</p>
                                    </div>
                                </div>

                                <div class="bg-slate-50 border border-slate-100 rounded-3xl p-6 max-h-[450px] overflow-y-auto">
                                    <div v-for="(err, key) in uploadErrors" :key="key" class="mb-4 last:mb-0">
                                        <div v-if="Array.isArray(err)" class="space-y-2">
                                            <Message v-for="(msg, mIdx) in err" :key="mIdx" severity="error" :closable="false" class="w-full justify-start text-sm font-bold">
                                                <span class="mr-2 font-black text-black uppercase tracking-tighter">{{ key }}:</span> {{ msg }}
                                            </Message>
                                        </div>
                                        <Message v-else severity="error" :closable="false" class="w-full justify-start text-sm font-bold">
                                            <span class="mr-2 font-black text-black uppercase tracking-tighter">{{ isNaN(key) ? key : 'Row ' + (parseInt(key) + 1) }}:</span> {{ err }}
                                        </Message>
                                    </div>
                                </div>

                                <div class="text-center pt-4">
                                    <Button label="Acknowledge & Re-try" icon="pi pi-sync" severity="danger" raised @click="reset" class="font-bold px-10" />
                                </div>
                            </div>
                        </div>

                    </div>
                </template>
            </Card>
        </div>
    </AdminLayout>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
</style>

