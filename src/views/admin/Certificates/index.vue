<script setup>
import { ref, onMounted } from 'vue';
import api from '@/services/api';
import AdminLayout from '@/components/AdminLayout.vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import ProgressSpinner from 'primevue/progressspinner';

const certificates = ref({ data: [] });
const isLoading = ref(false);
const searchQuery = ref('');

const currentLang = ref(localStorage.getItem('dashboard_lang') || 'ar');

const toggleLang = () => {
    currentLang.value = currentLang.value === 'ar' ? 'en' : 'ar';
    localStorage.setItem('dashboard_lang', currentLang.value);
};

const t = {
    ar: {
        loading: "جاري تحميل سجل الشهادات...",
        title: "سجل الشهادات الأكاديمية",
        subtitle: "عرض ومراقبة كافة الشهادات الممنوحة للطلاب الناجحين في النظام وتصديرها",
        manageTemplates: "إدارة القوالب",
        placeholderSearch: "البحث باسم الطالب أو رقم الشهادة...",
        colCertId: "كود الشهادة",
        colStudent: "الطالب",
        colAssessment: "الاختبار",
        colScore: "النسبة / الدرجة",
        colDate: "تاريخ الإصدار",
        colActions: "إجراءات",
        emptyTelemetry: "لم يتم إصدار أي شهادات في النظام بعد...",
        downloadPdf: "تحميل PDF",
        verifyLink: "رابط التحقق"
    },
    en: {
        loading: "Loading certificates registry...",
        title: "Issued Certificates",
        subtitle: "Monitor and manage all academic credentials issued by the system.",
        manageTemplates: "Manage Templates",
        placeholderSearch: "Search by student name or certificate number...",
        colCertId: "Certificate ID",
        colStudent: "Student",
        colAssessment: "Assessment",
        colScore: "Score",
        colDate: "Date",
        colActions: "Actions",
        emptyTelemetry: "No certificates found in system registry...",
        downloadPdf: "Download PDF",
        verifyLink: "Verify Link"
    }
};

const fetchCertificates = async (page = 1) => {
    isLoading.value = true;
    try {
        const res = await api.get(`/admin/certificates?page=${page}&search=${searchQuery.value}`);
        certificates.value = res.data;
    } catch (err) {
        console.error('Failed to fetch certificates', err);
    } finally {
        isLoading.value = false;
    }
};

onMounted(() => fetchCertificates());

const downloadCertificate = (cert) => {
    api.get(`/certificates/${cert.id}/download`, { responseType: 'blob' })
        .then(res => {
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = `Certificate-${cert.certificate_number}.pdf`;
            link.click();
        });
};

const onPage = (event) => {
    fetchCertificates(event.page + 1);
};
</script>

<template>
    <AdminLayout>
        <div :class="{ 'arabic-theme': currentLang === 'ar' }" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'" class="w-full">
            
            <!-- Loading Indicator -->
            <div v-if="isLoading && certificates.data.length === 0" class="flex flex-col items-center justify-center py-32 space-y-4">
                <ProgressSpinner />
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ t[currentLang].loading }}</p>
            </div>

            <div v-else class="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 mt-6 px-4 md:px-8 pb-20">
                
                <!-- Premium Header Section -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 md:space-y-0 relative overflow-hidden group">
                    <div class="absolute right-0 top-0 w-64 h-64 bg-rose-50/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-rose-100/30 transition-all duration-1000"></div>
                    <div class="absolute left-0 bottom-0 w-64 h-64 bg-slate-50/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl transition-all duration-1000"></div>
                    
                    <div class="relative z-10 space-y-2">
                        <h1 class="text-3xl font-black text-slate-800 tracking-tight leading-tight">
                            {{ t[currentLang].title }}
                        </h1>
                        <p class="text-xs font-bold text-slate-400 max-w-xl leading-relaxed">
                            {{ t[currentLang].subtitle }}
                        </p>
                    </div>
                    
                    <div class="flex flex-wrap items-center gap-4 relative z-10">
                        <!-- Language Selector Toggle -->
                        <button @click="toggleLang" class="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition-all duration-300 font-extrabold text-xs">
                            <i class="pi pi-globe text-brand-primary"></i>
                            <span>{{ currentLang === 'ar' ? 'English' : 'العربية' }}</span>
                        </button>

                        <router-link to="/admin/certificates/templates">
                            <Button :label="t[currentLang].manageTemplates" icon="pi pi-palette" outlined severity="secondary" 
                                    class="text-xs font-black uppercase tracking-wider px-6 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white" />
                        </router-link>
                    </div>
                </div>

                <!-- Premium Search Bar -->
                <div class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                    <div class="relative w-full max-w-xl">
                        <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 z-10" />
                        <InputText v-model="searchQuery" @input="fetchCertificates(1)"
                            :placeholder="t[currentLang].placeholderSearch"
                            class="w-full pl-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white text-xs font-bold shadow-sm" />
                    </div>
                </div>

                <!-- Premium DataTable Card -->
                <div class="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden mt-6">
                    <DataTable :value="certificates.data" :loading="isLoading" :rows="certificates.per_page" lazy
                        :totalRecords="certificates.total" @page="onPage" paginator class="p-datatable-sm text-sm"
                        responsiveLayout="scroll">

                        <!-- ID Column -->
                        <Column field="certificate_number" :header="t[currentLang].colCertId" class="font-mono text-xs font-extrabold text-slate-500"></Column>

                        <!-- Student Column -->
                        <Column :header="t[currentLang].colStudent">
                            <template #body="{ data }">
                                <div class="flex flex-col">
                                    <span class="font-extrabold text-slate-800 text-xs">
                                        {{ data.student?.user?.first_name }} {{ data.student?.user?.last_name }}
                                    </span>
                                    <span class="text-[10px] text-slate-400 font-bold tracking-wider mt-0.5">
                                        {{ data.student?.student_code }}
                                    </span>
                                </div>
                            </template>
                        </Column>

                        <!-- Assessment Column -->
                        <Column :header="t[currentLang].colAssessment">
                            <template #body="{ data }">
                                <span class="text-xs font-extrabold text-slate-600">
                                    {{ data.attempt?.exam?.title || data.attempt?.exam?.name || 'Academic Exam' }}
                                </span>
                            </template>
                        </Column>

                        <!-- Score Column -->
                        <Column :header="t[currentLang].colScore">
                            <template #body="{ data }">
                                <span class="px-3 py-1 rounded-xl bg-brand-primary/5 text-brand-primary font-black text-xs border border-brand-primary/10 shadow-sm">
                                    {{ data.score }}%
                                </span>
                            </template>
                        </Column>

                        <!-- Date Column -->
                        <Column :header="t[currentLang].colDate">
                            <template #body="{ data }">
                                <span class="text-xs font-bold text-slate-500 italic">
                                    {{ new Date(data.issue_date).toLocaleDateString() }}
                                </span>
                            </template>
                        </Column>

                        <!-- Actions Column -->
                        <Column :header="t[currentLang].colActions" class="text-right" style="width: 120px">
                            <template #body="{ data }">
                                <div class="flex justify-end gap-1.5">
                                    <Button icon="pi pi-download" text rounded severity="info" size="small"
                                        @click="downloadCertificate(data)" v-tooltip="t[currentLang].downloadPdf" />
                                    <a :href="'/verify-certificate/' + data.verification_code" target="_blank">
                                        <Button icon="pi pi-external-link" text rounded severity="secondary" size="small"
                                            v-tooltip="t[currentLang].verifyLink" />
                                    </a>
                                </div>
                            </template>
                        </Column>

                        <!-- Empty state slot -->
                        <template #empty>
                            <div class="py-16 text-center space-y-3">
                                 <div class="text-4xl opacity-20">📜</div>
                                 <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ t[currentLang].emptyTelemetry }}</p>
                            </div>
                        </template>
                    </DataTable>
                </div>
            </div>
        </div>
    </AdminLayout>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');

.arabic-theme {
    font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
}

.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

:deep(.p-datatable-thead > tr > th) {
    background: #fbfcfe;
    border-bottom: 2px solid #f1f5f9;
    padding: 1.25rem 1rem;
    color: #94a3b8;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
}

.arabic-theme :deep(.p-datatable-thead > tr > th) {
    text-align: right !important;
}
.arabic-theme :deep(.p-datatable-tbody > tr > td) {
    text-align: right !important;
}

:deep(.p-datatable-tbody > tr:hover) {
    background: #fbfcfe;
}
</style>
