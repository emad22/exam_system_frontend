<script setup>
import { useModal } from '@/composables/useModal';
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

const { showAlert } = useModal();

const router = useRouter();
const selectedFile = ref(null);
const isUploading = ref(false);
const uploadErrors = ref([]);
const successMsg = ref('');
const step = ref(1); // 1: Select, 2: Process, 3: Result

const partners = ref([]);
const partner_id = ref('');
const packages = ref([]);
const package_id = ref(null);
const skills = ref([]);
const assigned_skills = ref([]);

const fetchData = async () => {
    try {
        const [pRes, pkgRes, sRes] = await Promise.all([
            api.get('/admin/partners/active'),
            api.get('/admin/packages'),
            api.get('/admin/skills'),
        ]);
        partners.value = pRes.data;
        packages.value = pkgRes.data;
        skills.value = sRes.data;
    } catch (e) {
        console.error('Failed to load batch prerequisites', e);
    }
};

onMounted(fetchData);

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
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        successMsg.value = res.data.message;
        step.value = 3;
    } catch (err) {
        if (err.response?.data?.errors) {
            uploadErrors.value = err.response.data.errors;
        } else {
            uploadErrors.value = [err.response?.data?.message || 'Import failed. Please check your file and try again.'];
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
    if (newVal && newVal !== 4) {
        const pkg = packages.value.find(p => p.id === newVal);
        if (pkg && pkg.skills) assigned_skills.value = [...pkg.skills];
    }
});

// Watch manual skill changes to switch to Custom Pack
watch(assigned_skills, (newVal) => {
    if (package_id.value && package_id.value !== 4) {
        const pkg = packages.value.find(p => p.id === package_id.value);
        if (pkg && pkg.skills) {
            const current = [...newVal].sort().join(',');
            const target = [...pkg.skills].sort().join(',');
            if (current !== target) package_id.value = 4;
        }
    }
}, { deep: true });

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
        showAlert('Could not download the template. Please try again.');
    }
};

// Step labels for breadcrumb
const steps = [
    { n: 1, label: 'Configure' },
    { n: 2, label: 'Processing' },
    { n: 3, label: 'Result' },
];
</script>

<template>
    <AdminLayout>
        <div class="w-full space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 mt-6 px-4 md:px-8 pb-24">

            <!-- ── Header ──────────────────────────────────────────────────── -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                <div class="absolute right-0 top-0 w-64 h-64 bg-rose-50/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-rose-100/30 transition-all duration-1000"></div>
                <div class="absolute left-0 bottom-0 w-64 h-64 bg-slate-50/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>

                <div class="relative z-10 space-y-2">
                    <div class="flex items-center gap-2 text-xs font-extrabold text-brand-primary uppercase tracking-wider">
                        <i class="pi pi-users text-brand-accent"></i>
                        <span>Students · Batch Import</span>
                    </div>
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight leading-tight">
                        Register from Excel
                    </h1>
                    <p class="text-xs font-bold text-slate-400 max-w-xl leading-relaxed">
                        Upload a structured Excel or CSV file to register multiple students at once. Assign them to a partner, package, and skills in a single operation.
                    </p>
                </div>

                <div class="flex items-center gap-3 mt-6 md:mt-0 relative z-10">
                    <Button
                        label="Back to Students"
                        icon="pi pi-arrow-left"
                        severity="secondary"
                        outlined
                        class="text-xs font-extrabold uppercase tracking-wider rounded-xl border border-slate-200"
                        @click="router.push('/admin/students')"
                    />
                    <Button
                        label="Download Template"
                        icon="pi pi-download"
                        severity="contrast"
                        class="text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-md shadow-slate-200"
                        @click="downloadTemplate"
                    />
                </div>
            </div>

            <!-- ── Step Progress Bar ───────────────────────────────────────── -->
            <div class="bg-white rounded-2xl border border-slate-100 shadow-sm px-8 py-5">
                <div class="flex items-center gap-0">
                    <template v-for="(s, i) in steps" :key="s.n">
                        <!-- Step node -->
                        <div class="flex items-center gap-3">
                            <div class="flex items-center justify-center w-8 h-8 rounded-full text-xs font-black transition-all duration-300 border-2"
                                :class="step > s.n
                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                    : step === s.n
                                        ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20'
                                        : 'bg-white border-slate-200 text-slate-400'">
                                <i v-if="step > s.n" class="pi pi-check text-[10px]"></i>
                                <span v-else>{{ s.n }}</span>
                            </div>
                            <span class="text-[10px] font-extrabold uppercase tracking-widest hidden md:block"
                                :class="step >= s.n ? 'text-slate-700' : 'text-slate-300'">
                                {{ s.label }}
                            </span>
                        </div>
                        <!-- Connector line -->
                        <div v-if="i < steps.length - 1"
                            class="flex-1 mx-4 h-0.5 rounded-full transition-all duration-500"
                            :class="step > s.n ? 'bg-emerald-400' : 'bg-slate-100'">
                        </div>
                    </template>
                </div>
            </div>

            <!-- ── Step 1: Configure ───────────────────────────────────────── -->
            <div v-if="step === 1" class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                <!-- Row 1: Partner + Package -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

                    <!-- Partner Selection -->
                    <div class="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 space-y-5">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center text-white shadow-md shadow-brand-primary/20">
                                <i class="pi pi-briefcase text-sm"></i>
                            </div>
                            <div>
                                <p class="text-xs font-black text-slate-800 uppercase tracking-widest">Partner</p>
                                <p class="text-[10px] font-bold text-slate-400">Assign students to a partner</p>
                            </div>
                            <span class="ml-auto text-[9px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">Required</span>
                        </div>
                        <Select
                            v-model="partner_id"
                            :options="partners"
                            optionLabel="partner_name"
                            optionValue="id"
                            placeholder="Select a partner..."
                            class="w-full"
                        />
                    </div>

                    <!-- Package Selection -->
                    <div class="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 space-y-5">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center text-white shadow-md shadow-violet-200">
                                <i class="pi pi-box text-sm"></i>
                            </div>
                            <div>
                                <p class="text-xs font-black text-slate-800 uppercase tracking-widest">Package</p>
                                <p class="text-[10px] font-bold text-slate-400">Global package for all students</p>
                            </div>
                            <span class="ml-auto text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">Optional</span>
                        </div>
                        <Select
                            v-model="package_id"
                            :options="packages"
                            optionLabel="name"
                            optionValue="id"
                            placeholder="Select a package..."
                            class="w-full"
                        />
                    </div>
                </div>

                <!-- Skills Override -->
                <div class="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 space-y-6">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-200">
                                <i class="pi pi-verified text-sm"></i>
                            </div>
                            <div>
                                <p class="text-xs font-black text-slate-800 uppercase tracking-widest">Skills Override</p>
                                <p class="text-[10px] font-bold text-slate-400">Apply these skills to all imported students</p>
                            </div>
                        </div>
                        <span v-if="assigned_skills.length > 0"
                            class="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl">
                            {{ assigned_skills.length }} selected
                        </span>
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                        <label v-for="skill in skills" :key="skill.id"
                            class="flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer hover:shadow-md"
                            :class="assigned_skills.includes(skill.short_code)
                                ? 'border-brand-primary bg-rose-50/40 shadow-sm'
                                : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'">
                            <Checkbox :value="skill.short_code" v-model="assigned_skills" class="mb-3" />
                            <span class="text-[11px] font-extrabold text-slate-700 uppercase tracking-tighter text-center">
                                {{ skill.name }}
                            </span>
                            <span class="text-[9px] font-bold text-slate-400 mt-1 uppercase">{{ skill.short_code }}</span>
                        </label>
                    </div>
                </div>

                <!-- File Upload -->
                <div class="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 space-y-6">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-md shadow-amber-200">
                            <i class="pi pi-file-excel text-sm"></i>
                        </div>
                        <div>
                            <p class="text-xs font-black text-slate-800 uppercase tracking-widest">Excel / CSV File</p>
                            <p class="text-[10px] font-bold text-slate-400">Upload your student roster spreadsheet</p>
                        </div>
                        <span class="ml-auto text-[9px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">Required</span>
                    </div>

                    <!-- Drop Zone -->
                    <div class="border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all duration-300"
                        :class="selectedFile
                            ? 'border-emerald-300 bg-emerald-50/30'
                            : 'border-slate-200 bg-slate-50/50 hover:border-brand-primary/40 hover:bg-rose-50/20'">
                        <template v-if="!selectedFile">
                            <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 mb-5">
                                <i class="pi pi-cloud-upload text-3xl text-slate-300"></i>
                            </div>
                            <p class="text-sm font-extrabold text-slate-500 mb-1">Drop your file here or browse</p>
                            <p class="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-6">Accepts .xlsx · .xls · .csv — max 10 MB</p>
                            <FileUpload
                                mode="basic"
                                accept=".xlsx,.xls,.csv"
                                :maxFileSize="10000000"
                                @select="onFileSelect"
                                chooseLabel="Browse Files"
                                class="rounded-xl"
                            />
                        </template>
                        <template v-else>
                            <div class="flex items-center gap-4 bg-white rounded-2xl border border-emerald-100 shadow-sm p-5 w-full max-w-sm">
                                <div class="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                                    <i class="pi pi-file text-emerald-500 text-xl"></i>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-extrabold text-slate-700 truncate">{{ selectedFile.name }}</p>
                                    <p class="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{{ (selectedFile.size / 1024).toFixed(1) }} KB · Ready to import</p>
                                </div>
                                <button @click="removeFile"
                                    class="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-400 flex items-center justify-center transition-colors shrink-0">
                                    <i class="pi pi-times text-xs"></i>
                                </button>
                            </div>
                        </template>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-2xl border border-slate-100 shadow-sm px-8 py-5">
                    <Button
                        label="Cancel"
                        icon="pi pi-times"
                        severity="secondary"
                        outlined
                        class="text-xs font-extrabold uppercase tracking-wider rounded-xl px-6"
                        @click="router.push('/admin/students')"
                    />
                    <div class="flex items-center gap-3">
                        <p v-if="!selectedFile || !partner_id" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <i class="pi pi-info-circle mr-1"></i>
                            {{ !partner_id ? 'Select a partner first' : 'Upload a file to continue' }}
                        </p>
                        <Button
                            label="Start Import"
                            icon="pi pi-arrow-right"
                            iconPos="right"
                            :disabled="!selectedFile || !partner_id"
                            class="text-xs font-extrabold uppercase tracking-wider rounded-xl px-8 bg-brand-primary border-brand-primary shadow-lg shadow-rose-100"
                            @click="triggerUpload"
                        />
                    </div>
                </div>
            </div>

            <!-- ── Step 2: Processing ──────────────────────────────────────── -->
            <div v-else-if="step === 2"
                class="bg-white rounded-[2rem] border border-slate-100 shadow-sm py-32 flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div class="w-24 h-24 bg-brand-primary/5 rounded-3xl flex items-center justify-center">
                    <ProgressSpinner style="width: 56px; height: 56px" strokeWidth="4" animationDuration=".8s" />
                </div>
                <div class="text-center space-y-2">
                    <h2 class="text-2xl font-black text-slate-800 tracking-tight">Processing Import...</h2>
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Validating and importing student records</p>
                </div>
                <div class="flex items-center gap-2 px-5 py-2.5 bg-amber-50 rounded-xl border border-amber-100">
                    <i class="pi pi-clock text-amber-500 text-xs"></i>
                    <span class="text-[10px] font-extrabold text-amber-600 uppercase tracking-wider">Please wait — do not close this page</span>
                </div>
            </div>

            <!-- ── Step 3: Result ──────────────────────────────────────────── -->
            <div v-else-if="step === 3" class="animate-in fade-in slide-in-from-bottom-4 duration-700">

                <!-- ✅ Success -->
                <div v-if="successMsg"
                    class="bg-white rounded-[2rem] border border-emerald-100 shadow-sm py-24 flex flex-col items-center justify-center text-center space-y-8">
                    <div class="w-24 h-24 bg-emerald-50 rounded-3xl flex items-center justify-center">
                        <i class="pi pi-check-circle text-emerald-500" style="font-size: 3rem"></i>
                    </div>
                    <div class="space-y-3">
                        <h2 class="text-3xl font-black text-slate-800 tracking-tight">Import Successful!</h2>
                        <p class="text-sm font-bold text-emerald-600 max-w-md">{{ successMsg }}</p>
                    </div>
                    <div class="flex flex-col sm:flex-row items-center gap-3 pt-4">
                        <Button
                            label="View All Students"
                            icon="pi pi-users"
                            class="text-xs font-extrabold uppercase tracking-wider rounded-xl px-8 bg-brand-primary border-brand-primary shadow-lg shadow-rose-100"
                            @click="router.push('/admin/students')"
                        />
                        <Button
                            label="Import Another"
                            icon="pi pi-refresh"
                            severity="secondary"
                            outlined
                            class="text-xs font-extrabold uppercase tracking-wider rounded-xl px-6"
                            @click="reset"
                        />
                    </div>
                </div>

                <!-- ❌ Errors -->
                <div v-else class="space-y-6">
                    <!-- Error Header -->
                    <div class="bg-white rounded-[2rem] border border-rose-100 shadow-sm p-8 flex items-center gap-5">
                        <div class="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center shrink-0">
                            <i class="pi pi-exclamation-triangle text-rose-500 text-2xl"></i>
                        </div>
                        <div class="flex-1">
                            <h2 class="text-xl font-black text-slate-800">Import Failed</h2>
                            <p class="text-xs font-bold text-rose-400 uppercase tracking-widest mt-1">
                                {{ Object.keys(uploadErrors).length }} issue(s) found — fix them and retry
                            </p>
                        </div>
                        <Button
                            label="Retry Import"
                            icon="pi pi-refresh"
                            severity="danger"
                            outlined
                            class="text-xs font-extrabold uppercase tracking-wider rounded-xl px-6 shrink-0"
                            @click="reset"
                        />
                    </div>

                    <!-- Error List -->
                    <div class="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
                        <p class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-5">Error Details</p>
                        <div class="space-y-3 max-h-[450px] overflow-y-auto pr-2 no-scrollbar">
                            <div v-for="(err, key) in uploadErrors" :key="key">
                                <div v-if="Array.isArray(err)" class="space-y-2">
                                    <Message v-for="(msg, mIdx) in err" :key="mIdx"
                                        severity="error" :closable="false"
                                        class="w-full justify-start text-sm font-bold rounded-xl">
                                        <span class="mr-2 font-black text-black uppercase tracking-tighter">{{ key }}:</span> {{ msg }}
                                    </Message>
                                </div>
                                <Message v-else severity="error" :closable="false"
                                    class="w-full justify-start text-sm font-bold rounded-xl">
                                    <span class="mr-2 font-black text-black uppercase tracking-tighter">
                                        {{ isNaN(key) ? key : 'Row ' + (parseInt(key) + 1) }}:
                                    </span> {{ err }}
                                </Message>
                            </div>
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
.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}

.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

:deep(.p-select) {
    border-radius: 0.875rem;
    border-color: #e2e8f0;
    font-size: 0.875rem;
}

:deep(.p-select:focus),
:deep(.p-select.p-focus) {
    border-color: var(--brand-primary, #e11d48);
    box-shadow: 0 0 0 2px rgba(225, 29, 72, 0.12);
}

:deep(.p-fileupload-choose) {
    border-radius: 0.75rem;
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}
</style>
