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

const testTypes = [
    { label: 'None (Manual Check)', value: 'none' },
    { label: 'Audio Output (Speakers)', value: 'audio_output' },
    { label: 'Audio Input (Microphone)', value: 'audio_input' },
    { label: 'Video Input (Camera)', value: 'video_input' },
    { label: 'Network Speed Test', value: 'network_speed' },
    { label: 'Browser Compatibility', value: 'browser_compatibility' }
];

const form = ref({
    title: '',
    description: '',
    test_type: 'none',
    category: 'General',
    is_active: true,
    is_mandatory: true,
    order: 0,
    test_config: {}
});

const audioFile = ref(null);

const onFileSelect = (event) => {
    audioFile.value = event.target.files[0];
};

const saveRequirement = async () => {
    isSaving.value = true;
    errorMsg.value = '';

    try {
        const formData = new FormData();
        formData.append('title', form.value.title);
        formData.append('description', form.value.description);
        formData.append('test_type', form.value.test_type);
        formData.append('category', form.value.category);
        formData.append('is_active', form.value.is_active ? 1 : 0);
        formData.append('is_mandatory', form.value.is_mandatory ? 1 : 0);
        formData.append('order', form.value.order);
        formData.append('test_config', JSON.stringify(form.value.test_config));

        if (audioFile.value) {
            formData.append('audio_file', audioFile.value);
        }

        await api.post('/admin/system-requirements', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
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
                <div class="hidden md:flex items-center space-x-2 bg-rose-50 px-4 py-2 rounded-2xl border border-indigo-100">
                    <div class="w-2 h-2 bg-brand-primary rounded-full animate-pulse"></div>
                    <span class="text-[10px] font-black text-brand-primary uppercase tracking-widest">Technical Validation Logic</span>
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
                                            <div class="w-8 h-8 rounded-lg bg-brand-primary text-white flex items-center justify-center">
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
                                            <div class="w-8 h-8 rounded-lg bg-brand-primary text-white flex items-center justify-center">
                                                <i class="pi pi-cog text-xs"></i>
                                            </div>
                                            <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">Classification</h3>
                                        </div>

                                        <div class="flex flex-col space-y-2">
                                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Interactive Test Type</label>
                                            <Select v-model="form.test_type" :options="testTypes" optionLabel="label" optionValue="value" class="w-full rounded-xl bg-slate-50 border-slate-100" />
                                        </div>

                                        <!-- Audio Upload for Audio Output Test -->
                                        <div v-if="form.test_type === 'audio_output'" class="flex flex-col space-y-2 animate-in fade-in duration-300">
                                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Test Audio File</label>
                                            <div class="relative group">
                                                <input type="file" @change="onFileSelect" accept="audio/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                                <div class="flex items-center space-x-4 p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 group-hover:bg-indigo-50 transition-colors">
                                                    <div class="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-indigo-500 shadow-sm">
                                                        <i class="pi pi-volume-up"></i>
                                                    </div>
                                                    <div class="flex-1">
                                                        <p class="text-xs font-black text-slate-700">{{ audioFile ? audioFile.name : 'Select Custom Audio' }}</p>
                                                        <p class="text-[9px] font-bold text-slate-400 uppercase">MP3, WAV, or OGG (MAX 5MB)</p>
                                                    </div>
                                                    <i class="pi pi-upload text-indigo-300"></i>
                                                </div>
                                            </div>
                                            <p class="text-[9px] font-bold text-indigo-500 uppercase tracking-widest ml-1">This audio will play for the student during the test.</p>
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
                                <Button type="submit" label="Complete Provisioning" icon="pi pi-check" :loading="isSaving" class="w-full py-6 rounded-3xl shadow-lg shadow-rose-100 text-[10px] font-black tracking-widest uppercase transition-all hover:-translate-y-1" />
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

