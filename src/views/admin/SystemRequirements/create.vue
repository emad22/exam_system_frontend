<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Message from 'primevue/message';
import ToggleSwitch from 'primevue/toggleswitch';

const router = useRouter();

const isSaving = ref(false);
const errorMsg = ref('');

const categories = [
    { label: 'General', value: 'General' },
    { label: 'Browser', value: 'Browser' },
    { label: 'Internet', value: 'Internet' },
    { label: 'Hardware', value: 'Hardware' }
];

const form = ref({
    title: '',
    description: '',
    category: 'General',
    is_active: true,
    is_mandatory: true,
    order: 0
});

const saveRequirement = async () => {
    isSaving.value = true;
    errorMsg.value = '';

    try {
        await api.post('/admin/system-requirements', form.value);
        router.push('/admin/system-requirements');
    } catch (err) {
        console.error(err);
        errorMsg.value = err.response?.data?.message || 'Failed to initialize system prerequisite.';
    } finally {
        isSaving.value = false;
    }
};
</script>

<template>
    <AdminLayout>
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 mt-6 px-4">

            <!-- Standardized Header -->
            <div class="flex items-center justify-between bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                <div class="flex items-center space-x-6">
                    <Button icon="pi pi-arrow-left" severity="secondary" outlined rounded @click="router.push('/admin/system-requirements')" />
                    <div>
                         <h1 class="text-2xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Define prerequisite</h1>
                         <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Technical requirement provisioning</p>
                    </div>
                </div>
                <div class="hidden md:flex items-center space-x-2 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100">
                    <div class="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                    <span class="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Technical Validation Logic</span>
                </div>
            </div>

            <div class="max-w-6xl mx-auto">
                <form @submit.prevent="saveRequirement" class="space-y-8">
                    <Message v-if="errorMsg" severity="error" :closable="false" class="mb-4 rounded-2xl">
                        ERROR: {{ errorMsg }}
                    </Message>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        <!-- Left Column: Primary Identity -->
                        <div class="lg:col-span-2 space-y-8">
                            <Card class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                                <template #content>
                                    <div class="p-4 space-y-8">
                                        <div class="flex items-center space-x-3 mb-2">
                                            <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                                                <i class="pi pi-info-circle text-xs"></i>
                                            </div>
                                            <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">Requirement Details</h3>
                                        </div>

                                        <div class="flex flex-col space-y-2">
                                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Standard Title</label>
                                            <InputText v-model="form.title" required class="w-full rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all text-sm font-black uppercase" placeholder="e.g. STABLE_INTERNET_CONNECTION" />
                                            <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 italic">This title is visible during student technical verification.</p>
                                        </div>

                                        <div class="flex flex-col space-y-2">
                                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Functional Description</label>
                                            <Textarea v-model="form.description" rows="5" class="w-full rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all text-sm font-medium leading-relaxed" placeholder="Explain the technical requirement in detail..." />
                                        </div>
                                    </div>
                                </template>
                            </Card>
                        </div>

                        <!-- Right Column: Settings & Deployment -->
                        <div class="space-y-8">
                            <Card class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                                <template #content>
                                    <div class="p-4 space-y-8">
                                        <div class="flex items-center space-x-3 mb-2">
                                            <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                                                <i class="pi pi-cog text-xs"></i>
                                            </div>
                                            <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">Classification</h3>
                                        </div>

                                        <div class="flex flex-col space-y-2">
                                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Category</label>
                                            <Select v-model="form.category" :options="categories" optionLabel="label" optionValue="value" class="w-full rounded-xl bg-slate-50 border-slate-100" />
                                        </div>

                                        <div class="flex flex-col space-y-2">
                                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Priority Order</label>
                                            <InputNumber v-model="form.order" showButtons :min="0" class="w-full" inputClass="rounded-xl bg-slate-50 border-slate-100" />
                                        </div>

                                        <div class="space-y-4 pt-4 border-t border-slate-50">
                                            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group transition-all duration-300 hover:bg-white hover:border-indigo-100">
                                                <div class="space-y-0.5">
                                                    <p class="text-[11px] font-black text-slate-800 uppercase tracking-tight">Mandatory Item</p>
                                                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Strict Enforcement</p>
                                                </div>
                                                <ToggleSwitch v-model="form.is_mandatory" />
                                            </div>

                                            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group transition-all duration-300 hover:bg-white hover:border-indigo-100">
                                                <div class="space-y-0.5">
                                                    <p class="text-[11px] font-black text-slate-800 uppercase tracking-tight">Active Deployment</p>
                                                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Enable Visibility</p>
                                                </div>
                                                <ToggleSwitch v-model="form.is_active" />
                                            </div>
                                        </div>
                                    </div>
                                </template>
                            </Card>

                            <div class="pt-4">
                                <Button type="submit" label="Complete Provisioning" icon="pi pi-check" :loading="isSaving" class="w-full py-6 rounded-3xl shadow-lg shadow-indigo-100 text-[10px] font-black tracking-widest uppercase transition-all hover:-translate-y-1" />
                            </div>
                        </div>

                    </div>
                </form>
            </div>
        </div>
    </AdminLayout>
</template>

<style scoped>
:deep(.p-inputtext) {
    padding: 0.8rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
}

:deep(.p-select) {
    border-radius: 0.75rem;
}

@keyframes slide-in-bottom {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

.animate-in {
    animation: slide-in-bottom 0.8s ease-out;
}
</style>
