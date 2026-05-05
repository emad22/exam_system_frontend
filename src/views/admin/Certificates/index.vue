<script setup>
import { ref, onMounted } from 'vue';
import api from '@/services/api';
import AdminLayout from '@/components/AdminLayout.vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';

const certificates = ref({ data: [] });
const isLoading = ref(false);
const searchQuery = ref('');

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
        <div class="p-6">
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h1 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Issued Certificates</h1>
                    <p class="text-slate-500 text-sm font-medium italic">Monitor and manage all academic credentials
                        issued by the system.</p>
                </div>
                <div class="flex gap-2">
                    <router-link to="/admin/certificates/templates">
                        <Button label="Manage Templates" icon="pi pi-palette" class="p-button-outlined p-button-sm" />
                    </router-link>
                </div>
            </div>

            <div class="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <div class="p-4 border-b border-slate-50 flex justify-end">
                    <span class="p-input-icon-left w-full max-w-md">
                        <i class="pi pi-search" />
                        <InputText v-model="searchQuery" @input="fetchCertificates(1)"
                            placeholder="Search by student name or certificate number..."
                            class="w-full p-inputtext-sm" />
                    </span>
                </div>

                <DataTable :value="certificates.data" :loading="isLoading" :rows="certificates.per_page" lazy
                    :totalRecords="certificates.total" @page="onPage" paginator class="p-datatable-sm"
                    responsiveLayout="scroll">

                    <Column field="certificate_number" header="CERTIFICATE ID"
                        class="font-mono text-xs font-bold text-slate-500"></Column>

                    <Column header="STUDENT">
                        <template #body="{ data }">
                            <div class="flex flex-col">
                                <span class="font-black text-slate-800 uppercase text-xs">{{
                                    data.student?.user?.first_name }} {{ data.student?.user?.last_name }}</span>
                                <span class="text-[10px] text-slate-400 font-bold tracking-widest">{{
                                    data.student?.student_code }}</span>
                            </div>
                        </template>
                    </Column>

                    <Column header="ASSESSMENT">
                        <template #body="{ data }">
                            <span class="text-xs font-black text-slate-600 uppercase">{{ data.attempt?.exam?.name ||
                                'Academic Exam' }}</span>
                        </template>
                    </Column>

                    <Column header="SCORE">
                        <template #body="{ data }">
                            <span
                                class="px-2 py-1 rounded-lg bg-brand-primary/5 text-brand-primary font-black text-xs">{{
                                data.score }}%</span>
                        </template>
                    </Column>

                    <Column header="DATE">
                        <template #body="{ data }">
                            <span class="text-xs font-bold text-slate-500 italic">{{ new
                                Date(data.issue_date).toLocaleDateString() }}</span>
                        </template>
                    </Column>

                    <Column header="ACTIONS" class="text-right">
                        <template #body="{ data }">
                            <div class="flex justify-end gap-2">
                                <Button icon="pi pi-download" class="p-button-text p-button-sm p-button-rounded"
                                    @click="downloadCertificate(data)" v-tooltip="'Download PDF'" />
                                <a :href="'/verify-certificate/' + data.verification_code" target="_blank">
                                    <Button icon="pi pi-external-link"
                                        class="p-button-text p-button-sm p-button-rounded" v-tooltip="'Verify Link'" />
                                </a>
                            </div>
                        </template>
                    </Column>

                    <template #empty>
                        <div class="text-center py-12">
                            <i class="pi pi-inbox text-4xl text-slate-200 mb-4"></i>
                            <p class="text-slate-400 font-black uppercase text-xs tracking-widest">No certificates found
                            </p>
                        </div>
                    </template>
                </DataTable>
            </div>
        </div>
    </AdminLayout>
</template>

<style scoped>
:deep(.p-datatable-header) {
    background: transparent;
    border: none;
}

:deep(.p-datatable-thead > tr > th) {
    background: #f8fafc;
    color: #64748b;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 1.25rem 1rem;
}

:deep(.p-datatable-tbody > tr > td) {
    padding: 1rem;
    border-color: #f1f5f9;
}
</style>
