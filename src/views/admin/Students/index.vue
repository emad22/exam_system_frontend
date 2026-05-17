<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

import Button from 'primevue/button';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';

const router = useRouter();

const students = ref([]);
const packages = ref([]);
const loading = ref(true);
const isSaving = ref(false);
const skills = ref([]);

const selectedStudents = ref([]);
const searchQuery = ref('');

// Bulk Skills State
const showBulkSkillsModal = ref(false);
const bulkEmails = ref('');
const bulkSkills = ref('');
const bulkFile = ref(null);
const fileInput = ref(null);
const isBulkSaving = ref(false);

const modalConfig = ref({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    showCancel: false,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: null,
    onCancel: null
});

const showModal = (options) => {
    modalConfig.value = {
        visible: true,
        title: options.title || 'Notification',
        message: options.message || '',
        type: options.type || 'info',
        showCancel: options.showCancel || false,
        confirmText: options.confirmText || 'Yes',
        cancelText: options.cancelText || 'Cancel',
        onConfirm: options.onConfirm || null,
        onCancel: options.onCancel || null
    };
};

const handleModalConfirm = () => {
    modalConfig.value.visible = false;
    if (modalConfig.value.onConfirm) modalConfig.value.onConfirm();
};

const handleModalCancel = () => {
    modalConfig.value.visible = false;
    if (modalConfig.value.onCancel) modalConfig.value.onCancel();
};

const filteredStudents = computed(() => {
    if (!searchQuery.value) return students.value;
    const query = searchQuery.value.toLowerCase();
    return students.value.filter(s => {
        const name = `${s.user?.first_name || ''} ${s.user?.last_name || ''}`.toLowerCase();
        const email = (s.user?.email || '').toLowerCase();
        const code = (s.student_code || '').toLowerCase();
        return name.includes(query) || email.includes(query) || code.includes(query);
    });
});

const fetchStudents = async () => {
    loading.value = true;
    try {
        const res = await api.get('/admin/students');
        students.value = res.data.data || res.data;
    } catch (err) {
        console.error('Failed to load students', err);
    } finally {
        loading.value = false;
    }
};

const fetchSkills = async () => {
    try {
        const res = await api.get('/admin/skills');
        skills.value = res.data;
    } catch (err) {
        console.error('Failed to load skills', err);
    }
};

const fetchPackages = async () => {
    try {
        const res = await api.get('/admin/packages');
        packages.value = res.data;
    } catch (err) {
        console.error('Failed to load packages', err);
    }
};

const openView = (student) => {
    router.push(`/admin/students/${student.id}/show`);
};

const openEdit = (student) => {
    router.push(`/admin/students/${student.id}/edit`);
};

const deleteStudent = (student) => {
    const fullName = `${student.user?.first_name} ${student.user?.last_name}`;
    showModal({
        title: 'Delete Student',
        message: `Are you sure you want to permanently delete student: ${fullName}? This will also delete their User account and all exam history.`,
        type: 'danger',
        showCancel: true,
        confirmText: 'Yes, Delete Permanently',
        onConfirm: async () => {
            try {
                await api.delete(`/admin/students/${student.id}`);
                students.value = students.value.filter(s => s.id !== student.id);
            } catch (err) {
                showModal({
                    title: 'Error',
                    message: 'Failed to delete student.',
                    type: 'danger'
                });
            }
        }
    });
};

const resetProgress = (student) => {
    const fullName = `${student.user?.first_name} ${student.user?.last_name}`;
    showModal({
        title: 'Reset Progress',
        message: `CAUTION: Are you sure you want to reset all exam progress for ${fullName}? This will permanently delete their previous attempts and allow them to start fresh.`,
        type: 'warning',
        showCancel: true,
        confirmText: 'Yes, Reset Progress',
        onConfirm: async () => {
            try {
                await api.post(`/admin/students/${student.id}/reset`);
                showModal({
                    title: 'Success',
                    message: 'Candidate progress has been successfully reset.',
                    type: 'success',
                    onConfirm: () => {
                        fetchStudents();
                    }
                });
            } catch (err) {
                showModal({
                    title: 'Error',
                    message: err.response?.data?.error || 'Failed to reset progress.',
                    type: 'danger'
                });
            }
        }
    });
};

const bulkDelete = () => {
    if (!selectedStudents.value.length) return;
    showModal({
        title: 'Bulk Delete',
        message: `Are you sure you want to delete ${selectedStudents.value.length} selected students? This action cannot be undone.`,
        type: 'danger',
        showCancel: true,
        confirmText: 'Yes, Delete Selected',
        onConfirm: async () => {
            try {
                const ids = selectedStudents.value.map(s => s.id);
                await api.post('/admin/students/bulk-delete', { ids });
                students.value = students.value.filter(s => !ids.includes(s.id));
                selectedStudents.value = [];
            } catch (err) {
                showModal({
                    title: 'Error',
                    message: err.response?.data?.message || 'Failed to bulk delete students.',
                    type: 'danger'
                });
            }
        }
    });
};

const handleFileUpload = (e) => {
    bulkFile.value = e.target.files[0];
};

const downloadExcelTemplate = async () => {
    try {
        const response = await api.get('/admin/students/bulk-skills-export', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'students_skills_template.xlsx');
        document.body.appendChild(link);
        link.click();
    } catch (err) {
        console.error('Download error:', err);
        showModal({ title: 'Error', message: 'Failed to download template.', type: 'danger' });
    }
};

const submitBulkSkills = async () => {
    if (bulkFile.value) {
        const formData = new FormData();
        formData.append('file', bulkFile.value);
        isBulkSaving.value = true;
        try {
            const res = await api.post('/admin/students/bulk-skills-import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showBulkSkillsModal.value = false;
            fetchStudents();
        } catch (err) {
            showModal({ title: 'Error', message: err.response?.data?.message || 'Failed to import file.', type: 'danger' });
        } finally {
            isBulkSaving.value = false;
        }
    } else {
        if (!bulkEmails.value || !bulkSkills.value) return;
        const emailsArray = bulkEmails.value.split(/[\s,]+/).map(e => e.trim()).filter(e => e);
        const skillsArray = bulkSkills.value.split(/[\s,]+/).map(s => s.trim().toLowerCase()).filter(s => s);
        isBulkSaving.value = true;
        try {
            await api.post('/admin/students/bulk-skills', {
                emails: emailsArray,
                skills: skillsArray
            });
            showBulkSkillsModal.value = false;
            fetchStudents();
        } catch (err) {
            showModal({ title: 'Error', message: err.response?.data?.message || 'Failed to update skills.', type: 'danger' });
        } finally {
            isBulkSaving.value = false;
        }
    }
};

onMounted(() => {
    fetchStudents();
    fetchPackages();
    fetchSkills();
});
</script>

<template>
    <AdminLayout>
        <div class="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-24 mt-8 px-4 md:px-12">

            <!-- Standardized Header -->
            <div
                class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 md:space-y-0">
                <div>
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">
                        Candidate Registry</h1>
                    <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Lifecycle management
                        for registered entities</p>
                </div>
                <div class="flex flex-wrap items-center gap-3">
                    <Button v-if="selectedStudents.length > 0" label="Purge Selected" icon="pi pi-trash"
                        severity="danger" class="text-[10px] font-black uppercase tracking-widest px-6"
                        @click="bulkDelete" />
                    <Button label="Bulk Skills" icon="pi pi-tags" severity="secondary" outlined
                        class="text-[10px] font-black uppercase tracking-widest px-6"
                        @click="showBulkSkillsModal = true" />
                    <Button label="Matrix Import" icon="pi pi-file-excel" severity="secondary" outlined
                        class="text-[10px] font-black uppercase tracking-widest px-6"
                        @click="router.push('/admin/students/batch')" />
                    <Button label="Register Entity" icon="pi pi-plus"
                        class="bg-brand-primary border-none text-[10px] font-black uppercase tracking-widest px-8 shadow-lg shadow-rose-100 transition-all hover:-translate-y-1"
                        @click="router.push('/admin/students/create')" />
                </div>
            </div>

            <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
                <ProgressSpinner />
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Database Matrix...
                </p>
            </div>

            <!-- Registry Table Card -->
            <Card v-else class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden mt-6">
                <template #content>
                    <DataTable :value="filteredStudents" v-model:selection="selectedStudents" dataKey="id" paginator
                        :rows="10" class="p-datatable-sm text-sm" responsiveLayout="scroll">

                        <template #header>
                            <div class="flex justify-end p-2 pb-4">
                                <span class="relative">
                                    <i
                                        class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                                    <InputText v-model="searchQuery" placeholder="Search identities..."
                                        class="pl-10 w-full md:w-80 shadow-sm rounded-xl border-slate-100 font-bold" />
                                </span>
                            </div>
                        </template>

                        <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>

                        <Column header="Institutional Identity" style="min-width: 280px">
                            <template #body="{ data }">
                                <div class="flex items-center space-x-4">
                                    <div
                                        class="w-11 h-11 rounded-2xl bg-slate-50 text-brand-primary flex items-center justify-center font-black border border-slate-100">
                                        {{ data.user?.first_name ? data.user.first_name[0].toUpperCase() : 'S' }}
                                    </div>
                                    <div>
                                        <div @click="openView(data)"
                                            class="font-black text-slate-800 hover:text-brand-primary cursor-pointer uppercase tracking-tight transition-colors">
                                            {{ data.user?.first_name }} {{ data.user?.last_name }}
                                        </div>
                                        <div
                                            class="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                                            {{ data.user?.username || 'NO USERNAME' }} • {{ data.user?.email }}
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </Column>

                        <Column header="Subscription" style="min-width: 150px">
                            <template #body="{ data }">
                                <Tag v-if="data.package" :value="data.package.name" severity="info"
                                    class="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg" />
                                <span v-else
                                    class="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] italic">Custom
                                    Asset</span>
                            </template>
                        </Column>

                        <Column header="Category" style="min-width: 150px">
                            <template #body="{ data }">
                                <div class="flex flex-col space-y-1">

                                    <div v-if="data.not_adaptive"
                                        class="text-[8px] font-black text-brand-accent uppercase tracking-tighter">
                                        Non-Adaptive</div>
                                </div>
                            </template>
                        </Column>



                        <Column header="Active" style="min-width: 100px" class="text-center">
                            <template #body="{ data }">
                                <i :class="data.user?.is_active ? 'pi pi-check-circle text-emerald-500' : 'pi pi-times-circle text-rose-300'"
                                    class="text-lg"></i>
                            </template>
                        </Column>

                        <Column :exportable="false" style="min-width: 180px" class="text-right">
                            <template #body="{ data }">
                                <div class="flex items-center justify-end space-x-2">
                                    <Button icon="pi pi-eye" text severity="info" size="small" @click="openView(data)"
                                        v-tooltip.top="'View Profile'" />
                                    <Button icon="pi pi-refresh" text severity="danger" size="small"
                                        @click="resetProgress(data)" v-tooltip.top="'Reset Exam Progress'" />
                                    <Button icon="pi pi-pencil" text severity="warning" size="small"
                                        @click="openEdit(data)" v-tooltip.top="'Edit Details'" />
                                    <Button icon="pi pi-trash" text severity="danger" size="small"
                                        @click="deleteStudent(data)" v-tooltip.top="'Delete Identity'" />
                                </div>
                            </template>
                        </Column>

                        <template #empty>
                            <div
                                class="p-12 text-center text-slate-300 font-bold uppercase tracking-widest text-xs italic">
                                No candidate identities discovered.</div>
                        </template>
                    </DataTable>
                </template>
            </Card>
        </div>

        <!-- Bulk Skills Modal - Institutional Light mode -->
        <Dialog v-model:visible="showBulkSkillsModal" :header="'Institutional Sync • Bulk Mapping'"
            :style="{ width: '500px' }" modal class="rounded-[2.5rem] overflow-hidden border-none shadow-2xl">
            <template #header>
                <div class="flex flex-col">
                    <h3 class="text-xl font-black text-slate-800 uppercase tracking-tight">Institutional Sync</h3>
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Bulk module mapping
                        protocol</p>
                </div>
            </template>

            <div class="pt-6 space-y-8">

                <div
                    class="bg-rose-50/50 border border-brand-primary/10 p-5 rounded-2xl text-[10px] font-bold text-brand-primary leading-relaxed uppercase tracking-wider">
                    <i class="pi pi-info-circle mr-2"></i>
                    Update module assignments either by pasting emails or usernames manually, OR by uploading the master sheet.
                </div>

                <div class="space-y-6">
                    <div
                        class="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center space-y-4">
                        <Button label="Master Sheet Template" icon="pi pi-download" size="small" text
                            @click="downloadExcelTemplate"
                            class="text-[10px] uppercase font-black tracking-widest text-brand-primary" />
                        <input type="file" ref="fileInput" @change="handleFileUpload" accept=".xlsx,.xls,.csv"
                            class="w-full text-[10px] font-black uppercase text-slate-400 file:bg-brand-primary file:text-white file:border-none file:rounded-xl file:px-4 file:py-2 file:mr-4 file:cursor-pointer">
                    </div>

                    <div class="relative flex items-center justify-center">
                        <div class="absolute inset-0 flex items-center px-4">
                            <div class="w-full border-t border-slate-100"></div>
                        </div>
                        <span
                            class="relative bg-white px-4 text-[9px] font-black text-slate-300 uppercase tracking-widest">Manual
                            Override</span>
                    </div>

                    <div class="space-y-4">
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identity Access (Emails or Usernames)</label>
                            <textarea v-model="bulkEmails" 
                                class="w-full h-24 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold focus:bg-white focus:border-brand-primary/20 focus:ring-4 focus:ring-rose-50/50 transition-all outline-none no-scrollbar shadow-sm"
                                placeholder="E.G. JOHN@DOMAIN.COM OR USERNAME123..."></textarea>
                        </div>
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mapping Short Codes</label>
                            <input v-model="bulkSkills" type="text"
                                class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-black uppercase text-brand-primary focus:bg-white focus:border-brand-primary/20 focus:ring-4 focus:ring-rose-50/50 transition-all outline-none shadow-sm"
                                placeholder="E.G. R, W, G">
                        </div>
                    </div>
                </div>
            </div>

            <template #footer>
                <div class="flex justify-end pt-6 border-t border-slate-50 space-x-3">
                    <Button label="Discard" outlined severity="secondary"
                        class="text-[10px] font-black uppercase tracking-widest px-8"
                        @click="showBulkSkillsModal = false" />
                    <Button :label="isBulkSaving ? 'SYNCING...' : 'COMMIT SYNC'" :loading="isBulkSaving"
                        class="bg-brand-primary border-none text-[10px] font-black uppercase tracking-widest px-8 shadow-lg shadow-rose-100"
                        @click="submitBulkSkills" />
                </div>
            </template>
        </Dialog>

        <!-- Custom Beautiful Modal -->
        <Dialog v-model:visible="modalConfig.visible" modal :closable="false" :style="{ width: '450px' }" class="rounded-[2rem] overflow-hidden border-0 shadow-2xl z-50">
            <template #header>
                <div class="flex items-center gap-4 px-2 pt-2" :class="{
                    'text-emerald-500': modalConfig.type === 'success',
                    'text-rose-500': modalConfig.type === 'danger',
                    'text-amber-500': modalConfig.type === 'warning',
                    'text-indigo-500': modalConfig.type === 'info'
                }">
                    <div class="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm" :class="{
                        'bg-emerald-50 border-emerald-100 text-emerald-600': modalConfig.type === 'success',
                        'bg-rose-50 border-rose-100 text-rose-600': modalConfig.type === 'danger',
                        'bg-amber-50 border-amber-100 text-amber-600': modalConfig.type === 'warning',
                        'bg-indigo-50 border-indigo-100 text-indigo-600': modalConfig.type === 'info'
                    }">
                        <i class="text-2xl" :class="{
                            'pi pi-check-circle': modalConfig.type === 'success',
                            'pi pi-times-circle': modalConfig.type === 'danger',
                            'pi pi-exclamation-triangle': modalConfig.type === 'warning',
                            'pi pi-info-circle': modalConfig.type === 'info'
                        }"></i>
                    </div>
                    <h3 class="font-black text-2xl tracking-tight text-slate-800">{{ modalConfig.title }}</h3>
                </div>
            </template>
            <div class="px-2 py-4 text-slate-600 font-medium leading-relaxed text-base">
                {{ modalConfig.message }}
            </div>
            <template #footer>
                <div class="flex justify-end gap-3 w-full px-2 pb-2 mt-4">
                    <Button v-if="modalConfig.showCancel" :label="modalConfig.cancelText" text severity="secondary" @click="handleModalCancel" class="font-bold px-6 py-3 rounded-xl hover:bg-slate-100" />
                    <Button :label="modalConfig.confirmText" @click="handleModalConfirm" 
                        class="font-black px-6 py-3 rounded-xl border-none shadow-md hover:shadow-lg transition-all"
                        :class="{
                            'bg-emerald-500 hover:bg-emerald-600 text-white': modalConfig.type === 'success',
                            'bg-rose-500 hover:bg-rose-600 text-white': modalConfig.type === 'danger',
                            'bg-amber-500 hover:bg-amber-600 text-white': modalConfig.type === 'warning',
                            'bg-indigo-500 hover:bg-indigo-600 text-white': modalConfig.type === 'info'
                        }"
                    />
                </div>
            </template>
        </Dialog>
    </AdminLayout>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}

:deep(.p-datatable-thead > tr > th) {
    background: #fbfcfe;
    border-bottom: 2px solid #f1f5f9;
    padding: 1.5rem 1rem;
    color: #94a3b8;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.2em;
}

:deep(.p-datatable-tbody > tr:hover) {
    background: #fbfcfe;
}
</style>
