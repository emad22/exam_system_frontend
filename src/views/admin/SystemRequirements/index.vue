<script setup>
import { ref, onMounted } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import ToggleSwitch from 'primevue/toggleswitch';
import Select from 'primevue/select';
import Message from 'primevue/message';

const requirements = ref([]);
const isLoading = ref(true);
const displayDialog = ref(false);
const isEditing = ref(false);

const categories = [
    { label: 'General', value: 'General' },
    { label: 'Browser', value: 'Browser' },
    { label: 'Internet', value: 'Internet' },
    { label: 'Hardware', value: 'Hardware' }
];

const form = ref({
    id: null,
    title: '',
    description: '',
    category: 'General',
    is_active: true,
    is_mandatory: true,
    order: 0
});

const fetchRequirements = async () => {
    isLoading.value = true;
    try {
        const res = await api.get('/admin/system-requirements');
        requirements.value = res.data;
    } catch (err) {
        console.error(err);
    } finally {
        isLoading.value = false;
    }
};

onMounted(fetchRequirements);

const openNew = () => {
    form.value = {
        id: null,
        title: '',
        description: '',
        category: 'General',
        is_active: true,
        is_mandatory: true,
        order: requirements.value.length
    };
    isEditing.value = false;
    displayDialog.value = true;
};

const editRequirement = (req) => {
    form.value = { ...req };
    isEditing.value = true;
    displayDialog.value = true;
};

const saveRequirement = async () => {
    try {
        if (isEditing.value) {
            await api.patch(`/admin/system-requirements/${form.value.id}`, form.value);
        } else {
            await api.post('/admin/system-requirements', form.value);
        }
        displayDialog.value = false;
        fetchRequirements();
    } catch (err) {
        alert('Failed to save requirement');
    }
};

const deleteRequirement = async (id) => {
    if (!confirm('Are you sure you want to delete this requirement?')) return;
    try {
        await api.delete(`/admin/system-requirements/${id}`);
        fetchRequirements();
    } catch (err) {
        alert('Failed to delete');
    }
};
</script>

<template>
    <AdminLayout>
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <div>
                    <h1 class="text-2xl font-black text-slate-800">System Requirements</h1>
                    <p class="text-xs text-slate-500 uppercase tracking-widest mt-1">Manage technical prerequisites for students</p>
                </div>
                <Button label="Add Requirement" icon="pi pi-plus" size="small" @click="openNew" />
            </div>

            <DataTable :value="requirements" :loading="isLoading" class="p-datatable-sm bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <Column field="order" header="Order" style="width: 5rem"></Column>
                <Column field="category" header="Category">
                    <template #body="slotProps">
                        <span class="px-2 py-1 rounded-lg bg-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-600">{{ slotProps.data.category }}</span>
                    </template>
                </Column>
                <Column field="title" header="Requirement Title" class="font-bold"></Column>
                <Column field="is_mandatory" header="Mandatory">
                     <template #body="slotProps">
                        <i :class="slotProps.data.is_mandatory ? 'pi pi-check-circle text-indigo-500' : 'pi pi-circle text-slate-300'"></i>
                    </template>
                </Column>
                <Column field="is_active" header="Status">
                    <template #body="slotProps">
                        <span :class="slotProps.data.is_active ? 'text-emerald-500' : 'text-slate-300'" class="text-[10px] font-black uppercase tracking-widest">
                            {{ slotProps.data.is_active ? 'Active' : 'Inactive' }}
                        </span>
                    </template>
                </Column>
                <Column header="Actions" style="width: 8rem">
                    <template #body="slotProps">
                        <div class="flex space-x-2">
                            <Button icon="pi pi-pencil" text rounded size="small" @click="editRequirement(slotProps.data)" />
                            <Button icon="pi pi-trash" text rounded severity="danger" size="small" @click="deleteRequirement(slotProps.data.id)" />
                        </div>
                    </template>
                </Column>
            </DataTable>

            <Dialog v-model:visible="displayDialog" :header="isEditing ? 'Edit Requirement' : 'New Requirement'" modal :style="{ width: '500px' }" class="p-fluid">
                <div class="space-y-6 pt-4">
                    <div class="field">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Standard Title</label>
                        <InputText v-model="form.title" required placeholder="e.g. Stable Internet Connection" />
                    </div>
                    <div class="field">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Description / Details</label>
                        <Textarea v-model="form.description" required rows="3" placeholder="Explain why this is needed..." />
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="field">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Category</label>
                            <Select v-model="form.category" :options="categories" optionLabel="label" optionValue="value" />
                        </div>
                        <div class="field">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Display Order</label>
                            <InputText v-model="form.order" type="number" />
                        </div>
                    </div>
                    <div class="flex items-center justify-between bg-slate-50 p-4 rounded-xl">
                        <div class="flex items-center space-x-4">
                            <ToggleSwitch v-model="form.is_active" />
                            <span class="text-xs font-bold text-slate-700">Display to Students</span>
                        </div>
                        <div class="flex items-center space-x-4">
                            <ToggleSwitch v-model="form.is_mandatory" />
                            <span class="text-xs font-bold text-slate-700">Mandatory</span>
                        </div>
                    </div>
                </div>
                <template #footer>
                    <Button label="Cancel" text severity="secondary" @click="displayDialog = false" />
                    <Button label="Save Requirement" icon="pi pi-check" @click="saveRequirement" />
                </template>
            </Dialog>
        </div>
    </AdminLayout>
</template>
