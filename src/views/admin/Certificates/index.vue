<script setup>
import { ref, onMounted } from 'vue';
import api from '@/services/api';
import AdminLayout from '@/components/AdminLayout.vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import ProgressSpinner from 'primevue/progressspinner';
import ToggleSwitch from 'primevue/toggleswitch';

const certificates = ref({ data: [] });
const isLoading = ref(false);
const searchQuery = ref('');
const partners = ref([]);
const selectedPartnerId = ref(null);
const selectedCertificates = ref([]);
const isDownloadingBulk = ref(false);

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
        placeholderSearch: "البحث باسم الطالب، اسم المستخدم أو رقم الشهادة...",
        filterPartner: "تصفية حسب الشريك / البارتنر",
        allPartners: "جميع الشركاء",
        bulkDownload: "تنزيل المحددة (ZIP)",
        bulkDownloadPartner: "تنزيل شهادات البارتنر (ZIP)",
        colCertId: "كود الشهادة",
        colStudent: "الطالب",
        colPartner: "الشركة / البارتنر",
        colAssessment: "الاختبار",
        colScore: "النسبة / الدرجة",
        colDate: "تاريخ الإصدار",
        colActions: "إجراءات",
        colQr: "QR Code",
        colVisibility: "ظهور للطالب",
        emptyTelemetry: "لم يتم إصدار أي شهادات في النظام بعد...",
        downloadPdf: "تحميل PDF",
        verifyLink: "رابط التحقق"
    },
    en: {
        loading: "Loading certificates registry...",
        title: "Issued Certificates",
        subtitle: "Monitor and manage all academic credentials issued by the system.",
        manageTemplates: "Manage Templates",
        placeholderSearch: "Search by student name, username or certificate number...",
        filterPartner: "Filter by Partner",
        allPartners: "All Partners",
        bulkDownload: "Download Selected (ZIP)",
        bulkDownloadPartner: "Download Partner Certs (ZIP)",
        colCertId: "Certificate ID",
        colStudent: "Student",
        colPartner: "Partner",
        colAssessment: "Assessment",
        colScore: "Score",
        colDate: "Date",
        colActions: "Actions",
        colQr: "QR Code",
        colVisibility: "Visible to Student",
        emptyTelemetry: "No certificates found in system registry...",
        downloadPdf: "Download PDF",
        verifyLink: "Verify Link"
    }
};

const fetchPartners = async () => {
    try {
        const res = await api.get('/admin/partners/active');
        partners.value = res.data || [];
    } catch (err) {
        console.error('Failed to fetch partners', err);
    }
};

const fetchCertificates = async (page = 1) => {
    isLoading.value = true;
    try {
        let url = `/admin/certificates?page=${page}&search=${searchQuery.value}`;
        if (selectedPartnerId.value) {
            url += `&partner_id=${selectedPartnerId.value}`;
        }
        const res = await api.get(url);
        certificates.value = res.data;
    } catch (err) {
        console.error('Failed to fetch certificates', err);
    } finally {
        isLoading.value = false;
    }
};

onMounted(() => {
    fetchPartners();
    fetchCertificates();
});

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

const bulkDownloadCertificates = async () => {
    if (selectedCertificates.value.length === 0 && !selectedPartnerId.value) return;
    
    isDownloadingBulk.value = true;
    try {
        const payload = {};
        if (selectedCertificates.value.length > 0) {
            payload.certificate_ids = selectedCertificates.value.map(c => c.id);
        } else if (selectedPartnerId.value) {
            payload.partner_id = selectedPartnerId.value;
        }

        const res = await api.post('/admin/certificates/bulk-download', payload, {
            responseType: 'blob'
        });

        const blob = new Blob([res.data], { type: 'application/zip' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        const partnerObj = partners.value.find(p => p.id === selectedPartnerId.value);
        const namePrefix = partnerObj ? partnerObj.partner_name.replace(/\s+/g, '_') : 'Export';
        link.download = `Certificates_${namePrefix}_${Date.now()}.zip`;
        link.click();
    } catch (err) {
        console.error('Bulk download failed', err);
        alert('Failed to download certificates ZIP archive.');
    } finally {
        isDownloadingBulk.value = false;
    }
};

const regenerateCertificate = async (cert) => {
    try {
        const res = await api.post(`/admin/certificates/create-for-attempt/${cert.exam_attempt_id}`);
        if (res.data.certificate) {
            certificates.value.data = certificates.value.data.map(c => c.id === res.data.certificate.id ? res.data.certificate : c);
        }
        alert('Certificate regenerated. You can now download the updated PDF.');
    } catch (err) {
        console.error('Failed to regenerate certificate', err);
        alert('Failed to regenerate certificate.');
    }
};

const onPage = (event) => {
    fetchCertificates(event.page + 1);
};

const getQrUrl = (cert) => {
    const verificationUrl = window.location.origin + '/verify-certificate/' + cert.verification_code;
    return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(verificationUrl)}`;
};

const toggleVisibility = async (cert) => {
    try {
        const res = await api.patch(`/admin/certificates/${cert.id}/toggle-visibility`);
        cert.is_visible_to_student = res.data.is_visible_to_student;
    } catch (err) {
        console.error('Failed to toggle visibility', err);
    }
};

const deleteCertificate = async (cert) => {
    if (!confirm('Delete this certificate? This action cannot be undone.')) return;
    try {
        await api.delete(`/admin/certificates/${cert.id}`);
        certificates.value.data = certificates.value.data.filter(c => c.id !== cert.id);
    } catch (err) {
        console.error('Failed to delete certificate', err);
        alert('Failed to delete certificate.');
    }
};
</script>

<template>
    <AdminLayout>
        <div :class="{ 'arabic-theme': currentLang === 'ar' }" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'"
            class="w-full">

            <!-- Loading Indicator -->
            <div v-if="isLoading && certificates.data.length === 0"
                class="flex flex-col items-center justify-center py-32 space-y-4">
                <ProgressSpinner />
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ t[currentLang].loading }}</p>
            </div>

            <div v-else
                class="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 mt-6 px-4 md:px-8 pb-20">

                <!-- Premium Header Section -->
                <div
                    class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 md:space-y-0 relative overflow-hidden group">
                    <div
                        class="absolute right-0 top-0 w-64 h-64 bg-rose-50/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-rose-100/30 transition-all duration-1000">
                    </div>
                    <div
                        class="absolute left-0 bottom-0 w-64 h-64 bg-slate-50/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl transition-all duration-1000">
                    </div>

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
                        <button @click="toggleLang"
                            class="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition-all duration-300 font-extrabold text-xs">
                            <i class="pi pi-globe text-brand-primary"></i>
                            <span>{{ currentLang === 'ar' ? 'English' : 'العربية' }}</span>
                        </button>

                        <router-link to="/admin/certificates/templates">
                            <Button :label="t[currentLang].manageTemplates" icon="pi pi-palette" outlined
                                severity="secondary"
                                class="text-xs font-black uppercase tracking-wider px-6 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white" />
                        </router-link>
                    </div>
                </div>

                <!-- Premium Search & Filter Bar -->
                <div
                    class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                    <div class="relative w-full md:max-w-md">
                        <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 z-10" />
                        <InputText v-model="searchQuery" @input="fetchCertificates(1)"
                            :placeholder="t[currentLang].placeholderSearch"
                            class="w-full pl-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white text-xs font-bold shadow-sm" />
                    </div>

                    <div class="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                        <!-- Partner Filter Dropdown -->
                        <Dropdown v-model="selectedPartnerId" :options="partners" optionLabel="partner_name" optionValue="id"
                            showClear :placeholder="t[currentLang].filterPartner" @change="fetchCertificates(1)"
                            class="w-full md:w-64 text-xs font-bold rounded-2xl border-slate-200" />

                        <!-- Bulk ZIP Download Button -->
                        <Button
                            :label="selectedCertificates.length > 0 ? `${t[currentLang].bulkDownload} (${selectedCertificates.length})` : (selectedPartnerId ? t[currentLang].bulkDownloadPartner : t[currentLang].bulkDownload)"
                            icon="pi pi-file-export"
                            severity="success"
                            class="text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-sm"
                            :disabled="selectedCertificates.length === 0 && !selectedPartnerId"
                            :loading="isDownloadingBulk"
                            @click="bulkDownloadCertificates()" />
                    </div>
                </div>

                <!-- Premium DataTable Card -->
                <div class="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden mt-6">
                    <DataTable v-model:selection="selectedCertificates" :value="certificates.data" :loading="isLoading" :rows="certificates.per_page" lazy
                        :totalRecords="certificates.total" @page="onPage" paginator class="p-datatable-sm text-sm"
                        responsiveLayout="scroll" dataKey="id">

                        <!-- Selection Checkbox Column -->
                        <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>

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

                        <!-- Partner Column -->
                        <Column :header="t[currentLang].colPartner">
                            <template #body="{ data }">
                                <span v-if="data.student?.partner" class="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                                    {{ data.student.partner.partner_name }}
                                </span>
                                <span v-else class="text-xs font-bold text-slate-400 italic">
                                    —
                                </span>
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
                                <span
                                    class="px-3 py-1 rounded-xl bg-brand-primary/5 text-brand-primary font-black text-xs border border-brand-primary/10 shadow-sm">
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

                        <!-- QR Code Column -->
                        <Column :header="t[currentLang].colQr" style="width: 80px">
                            <template #body="{ data }">
                                <div class="flex justify-center">
                                    <a :href="'/verify-certificate/' + data.verification_code" target="_blank"
                                        class="block">
                                        <img :src="getQrUrl(data)" alt="QR"
                                            class="w-12 h-12 rounded-lg border border-slate-100 shadow-sm hover:shadow-md hover:scale-110 transition-all cursor-pointer" />
                                    </a>
                                </div>
                            </template>
                        </Column>

                        <!-- Visibility Toggle Column -->
                        <Column :header="t[currentLang].colVisibility" style="width: 100px">
                            <template #body="{ data }">
                                <div class="flex justify-center">
                                    <ToggleSwitch v-model="data.is_visible_to_student"
                                        @change="toggleVisibility(data)" />
                                </div>
                            </template>
                        </Column>

                        <!-- Actions Column -->
                        <Column :header="t[currentLang].colActions" class="text-right" style="width: 120px">
                            <template #body="{ data }">
                                <div class="flex justify-end gap-1.5">
                                    <Button icon="pi pi-download" text rounded severity="info" size="small"
                                        @click="downloadCertificate(data)" v-tooltip="t[currentLang].downloadPdf" />
                                    <Button icon="pi pi-refresh" text rounded severity="warning" size="small"
                                        @click="regenerateCertificate(data)" v-tooltip="'Regenerate PDF'" />
                                    <a :href="'/verify-certificate/' + data.verification_code" target="_blank">
                                        <Button icon="pi pi-external-link" text rounded severity="secondary"
                                            size="small" v-tooltip="t[currentLang].verifyLink" />
                                    </a>
                                    <Button icon="pi pi-trash" text rounded severity="danger" size="small"
                                        @click="deleteCertificate(data)" v-tooltip="'Delete Certificate'" />
                                </div>
                            </template>
                        </Column>

                        <!-- Empty state slot -->
                        <template #empty>
                            <div class="py-16 text-center space-y-3">
                                <div class="text-4xl opacity-20">📜</div>
                                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{
                                    t[currentLang].emptyTelemetry }}</p>
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
