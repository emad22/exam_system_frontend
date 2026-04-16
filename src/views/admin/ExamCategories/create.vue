<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import ToggleSwitch from 'primevue/toggleswitch';
import Card from 'primevue/card';
import Message from 'primevue/message';

const router = useRouter();
const isSaving = ref(false);
const errorMsg = ref('');

const form = ref({
    name: '',
    description: '',
    is_active: true
});

const saveCategory = async () => {
    if (!form.value.name) {
        errorMsg.value = 'Category name is required identity metadata.';
        return;
    }
    
    isSaving.value = true;
    errorMsg.value = '';
    try {
        await api.post('/admin/exam-categories', form.value);
        router.push('/admin/exam-categories');
    } catch (err) {
        console.error(err);
        errorMsg.value = err.response?.data?.message || 'Failed to register category. Ensure the name is unique.';
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
                    <Button icon="pi pi-arrow-left" severity="secondary" outlined rounded @click="router.push('/admin/exam-categories')" />
                    <div>
                         <h1 class="text-2xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Register tier</h1>
                         <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Classification provisioning</p>
                    </div>
                </div>
                <div class="hidden md:flex items-center space-x-2 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100">
                    <div class="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                    <span class="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Structural Management</span>
                </div>
            </div>

            <div class="max-w-5xl mx-auto">
                <form @submit.prevent="saveCategory" class="space-y-8">
                    <Message v-if="errorMsg" severity="error" :closable="false" class="mb-4 rounded-2xl">
                        ERROR: {{ errorMsg }}
                    </Message>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <!-- Main Content: Identity -->
                        <div class="lg:col-span-2">
                            <Card class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                                <template #content>
                                    <div class="p-4 space-y-8">
                                        <div class="flex items-center space-x-3 mb-2">
                                            <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                                                <i class="pi pi-tag text-xs"></i>
                                            </div>
                                            <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">Classification Identity</h3>
                                        </div>

                                        <div class="flex flex-col space-y-2">
                                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Functional Name</label>
                                            <InputText v-model="form.name" required class="w-full rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all text-sm font-black uppercase" placeholder="e.g. ADULT_ADVANCED" />
                                            <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 italic">This identifier is used across system registries.</p>
                                        </div>

                                        <div class="flex flex-col space-y-2">
                                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Strategic Description</label>
                                            <Textarea v-model="form.description" rows="5" class="w-full rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all text-sm font-medium leading-relaxed" placeholder="Define the educational objectives for this tier..." />
                                        </div>
                                    </div>
                                </template>
                            </Card>
                        </div>

                        <!-- Right Column: Settings & Actions -->
                        <div class="space-y-8">
                            <Card class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                                <template #content>
                                    <div class="p-4 space-y-8">
                                        <div class="flex items-center space-x-3 mb-2">
                                            <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                                                <i class="pi pi-cog text-xs"></i>
                                            </div>
                                            <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">Deployment</h3>
                                        </div>

                                        <div class="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group transition-all duration-300 hover:bg-white hover:border-indigo-100">
                                            <div class="space-y-0.5">
                                                <p class="text-[11px] font-black text-slate-800 uppercase tracking-tight">Active Status</p>
                                                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Enable enrollment</p>
                                            </div>
                                            <ToggleSwitch v-model="form.is_active" />
                                        </div>
                                    </div>
                                </template>
                            </Card>

                            <div class="pt-4">
                                <Button type="submit" :label="isSaving ? 'Processing...' : 'Complete Registration'" icon="pi pi-check" :loading="isSaving" class="w-full py-6 rounded-3xl shadow-lg shadow-indigo-100 text-[10px] font-black tracking-widest uppercase transition-all hover:-translate-y-1" />
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </AdminLayout>
</template>

<style scoped>
.premium-input-xl {
    width: 100%;
    padding: 1.5rem 2rem;
    border-radius: 2rem;
    border: 2px solid #f1f5f9;
    background: #f8fafc;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.premium-input-xl:focus {
    background: white;
    border-color: #6366f1;
    box-shadow: 0 20px 50px -10px rgba(99, 102, 241, 0.15);
    outline: none;
    transform: translateY(-2px);
}

@keyframes slide-in-bottom {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

.animate-in {
    animation: slide-in-bottom 0.8s ease-out;
}
</style>
