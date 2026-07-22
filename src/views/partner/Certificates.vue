<script setup>
import { ref, onMounted } from 'vue';
import api from '@/services/api';
import PartnerLayout from '@/components/PartnerLayout.vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import ProgressSpinner from 'primevue/progressspinner';

const certificates = ref({ data: [] });
const isLoading = ref(false);
const searchQuery = ref('');

const fetchCertificates = async (page = 1) => {
    isLoading.value = true;
    try {
        const res = await api.get(`/partner/certificates?page=${page}&search=${searchQuery.value}`);
        certificates.value = res.data;
    } catch (err) {
        console.error('Failed to fetch certificates', err);
    } finally {
        isLoading.value = false;
    }
};

onMounted(() => fetchCertificates());

const getQrUrl = (cert) => {
    const verificationUrl = window.location.origin + '/verify-certificate/' + cert.verification_code;
    return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(verificationUrl)}`;
};

const onPage = (event) => {
    fetchCertificates(event.page + 1);
};

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
</script>

<template>
    <PartnerLayout>
        <div class="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 mt-6 px-4 md:px-8 pb-20">

            <!-- Premium Header Section -->
            <div
                class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 md:space-y-0 relative overflow-hidden group">
                <div
                    class="absolute right-0 top-0 w-64 h-64 bg-indigo-50/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-indigo-100/30 transition-all duration-1000">
                </div>
                <div
                    class="absolute left-0 bottom-0 w-64 h-64 bg-slate-50/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl transition-all duration-1000">
                </div>

                <div class="relative z-10 space-y-2">
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight leading-tight">
                        Student Certificates
                    </h1>
                    <p class="text-xs font-bold text-slate-400 max-w-xl leading-relaxed">
                        View all academic certificates issued to your students
                    </p>
                </div>
            </div>

            <!-- Premium Search Bar -->
            <div
                class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                <div class="relative w-full max-w-xl">
                    <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 z-10" />
                    <InputText v-model="searchQuery" @input="fetchCertificates(1)"
                        placeholder="Search by student name, username or certificate number..."
                        class="w-full pl-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white text-xs font-bold shadow-sm" />
                </div>
            </div>

            <!-- Loading Indicator -->
            <div v-if="isLoading && certificates.data.length === 0"
                class="flex flex-col items-center justify-center py-32 space-y-4">
                <ProgressSpinner />
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading certificates...</p>
            </div>

            <!-- Premium DataTable Card -->
            <div v-else class="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden mt-6">
                <DataTable :value="certificates.data" :loading="isLoading" :rows="certificates.per_page" lazy
                    :totalRecords="certificates.total" @page="onPage" paginator class="p-datatable-sm text-sm"
                    responsiveLayout="scroll">

                    <!-- ID Column -->
                    <Column field="certificate_number" header="Certificate ID"
                        class="font-mono text-xs font-extrabold text-slate-500"></Column>

                    <!-- Student Column -->
                    <Column header="Student">
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
                    <Column header="Assessment">
                        <template #body="{ data }">
                            <span class="text-xs font-extrabold text-slate-600">
                                {{ data.attempt?.exam?.title || data.attempt?.exam?.name || 'Academic Exam' }}
                            </span>
                        </template>
                    </Column>

                    <!-- Score Column -->
                    <Column header="Score">
                        <template #body="{ data }">
                            <span
                                class="px-3 py-1 rounded-xl bg-brand-primary/5 text-brand-primary font-black text-xs border border-brand-primary/10 shadow-sm">
                                {{ data.score }}%
                            </span>
                        </template>
                    </Column>

                    <!-- Date Column -->
                    <Column header="Date">
                        <template #body="{ data }">
                            <span class="text-xs font-bold text-slate-500 italic">
                                {{ new Date(data.issue_date).toLocaleDateString() }}
                            </span>
                        </template>
                    </Column>

                    <!-- QR Code Column -->
                    <Column header="QR Code" style="width: 80px">
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

                    <!-- Actions Column -->
                    <Column header="Actions" class="text-right" style="width: 120px">
                        <template #body="{ data }">
                            <div class="flex justify-end gap-1.5">
                                <Button icon="pi pi-download" text rounded severity="info" size="small"
                                    @click="downloadCertificate(data)" v-tooltip="'Download PDF'" />
                                <a :href="'/verify-certificate/' + data.verification_code" target="_blank">
                                    <Button icon="pi pi-external-link" text rounded severity="secondary" size="small"
                                        v-tooltip="'Verify Link'" />
                                </a>
                            </div>
                        </template>
                    </Column>

                    <!-- Empty state slot -->
                    <template #empty>
                        <div class="py-16 text-center space-y-3">
                            <div class="text-4xl opacity-20">📜</div>
                            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">No certificates found
                                for your students...</p>
                        </div>
                    </template>
                </DataTable>
            </div>
        </div>
    </PartnerLayout>
</template>

<style scoped>
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

:deep(.p-datatable-tbody > tr:hover) {
    background: #fbfcfe;
}
</style>
