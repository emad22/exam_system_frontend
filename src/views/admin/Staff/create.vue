<script setup>
import { useModal } from '@/composables/useModal';
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';
import Card from 'primevue/card';
import ProgressSpinner from 'primevue/progressspinner';
import RadioButton from 'primevue/radiobutton';
import Message from 'primevue/message';

const { showAlert, showConfirm } = useModal();

const route = useRoute();
const router = useRouter();
const staffId = route.params.id;
const isEditing = ref(!!staffId);

const form = ref({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    password: '',
    role: 'teacher',
    is_active: true,
    partner_name: '',
    phone: '',
    website: '',
    country: '',
    note: '',
    proctoring_required: false,
});

const roles = [
    { value: 'admin', label: 'Administrator', desc: 'Full system access & control' },
    { value: 'teacher', label: 'Teacher / Proctor', desc: 'Manage exams & view results' },
    { value: 'supervisor', label: 'Academic Supervisor', desc: 'Reporting & quality control' },
    { value: 'demo', label: 'Demo Account', desc: 'Limited system trial access' },
    { value: 'partner', label: 'Partner', desc: 'Partner system dashboard' },
];

const isSubmitting = ref(false);
const loading = ref(false);
const errorMsg = ref('');

const fetchStaff = async () => {
    if (!isEditing.value) return;
    loading.value = true;
    try {
        const res = await api.get(`/admin/staff/${staffId}`);
        const data = res.data;
        // Map user and partner data to the flat form structure
        form.value = {
            ...data,
            username: data.username || '',
            password: '',
            partner_name: data.partner?.partner_name || '',
            website: data.partner?.website || '',
            note: data.partner?.note || '',
            proctoring_required: !!data.partner?.proctoring_required,
        };
    } catch (err) {
        console.error('Failed to load identity', err);
        router.push('/admin/staff');
    } finally {
        loading.value = false;
    }
};

const saveStaff = async () => {
    isSubmitting.value = true;
    errorMsg.value = '';
    try {
        if (isEditing.value) {
            await api.patch(`/admin/staff/${staffId}`, form.value);
        } else {
            await api.post('/admin/staff', form.value);
        }
        showAlert(isEditing.value ? 'Identity updated successfully.' : 'Staff member registered.');
        router.push('/admin/staff');
    } catch (err) {
        errorMsg.value = err.response?.data?.message || 'Failed to persist staff data.';
    } finally {
        isSubmitting.value = false;
    }
};

onMounted(() => {
    fetchStaff();
    if (route.query.role && !isEditing.value) {
        form.value.role = route.query.role;
    }
});
</script>

<template>
    <AdminLayout>
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 mt-6 px-4 md:px-12">
            <!-- Header -->
            <div class="flex items-center space-x-6">
                <Button icon="pi pi-arrow-left" severity="secondary" outlined rounded
                    @click="$router.push('/admin/staff')" />
                <div>
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight">
                        {{ isEditing ? 'Edit Identity' : 'Register Staff' }}
                    </h1>
                    <p class="text-xs font-bold text-slate-500 mt-1">
                        {{ isEditing ? 'Modifying existing credentials' : 'Adding new administrative node' }}
                    </p>
                </div>
            </div>

            <div v-if="loading" class="flex flex-col items-center justify-center py-20">
                <ProgressSpinner />
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hydrating data...</p>
            </div>

            <div v-else class="relative">
                <form @submit.prevent="saveStaff" class="space-y-8">
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        <!-- Main Details -->
                        <div class="lg:col-span-2 space-y-8">
                            <Card class="border border-slate-100 shadow-sm rounded-[2.5rem]">
                                <template #content>
                                    <div class="space-y-8 p-4">
                                        <div class="flex items-center space-x-4">
                                            <div class="w-1.5 h-6 bg-brand-primary rounded-full"></div>
                                            <h3 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">
                                                Core Credentials</h3>
                                        </div>

                                        <Message v-if="errorMsg" severity="error" :closable="false">{{ errorMsg }}
                                        </Message>

                                        <div class="space-y-8">
                                            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div class="flex flex-col">
                                                    <label
                                                        class="block text-xs font-bold text-slate-500 mb-2 pl-2">First
                                                        Name</label>
                                                    <InputText v-model="form.first_name" required placeholder="John"
                                                        class="w-full shadow-sm rounded-xl uppercase" />
                                                </div>
                                                <div class="flex flex-col">
                                                    <label class="block text-xs font-bold text-slate-500 mb-2 pl-2">Last
                                                        Name</label>
                                                    <InputText v-model="form.last_name" required placeholder="Doe"
                                                        class="w-full shadow-sm rounded-xl uppercase" />
                                                </div>
                                            </div>

                                            <div class="flex flex-col">
                                                <label class="block text-xs font-bold text-slate-500 mb-2 pl-2">Username (Identifier)</label>
                                                <InputText v-model="form.username" required
                                                    placeholder="j.doe123"
                                                    class="w-full shadow-sm rounded-xl" />
                                            </div>

                                            <div class="flex flex-col">
                                                <label class="block text-xs font-bold text-slate-500 mb-2 pl-2">Email
                                                    Channel</label>
                                                <InputText v-model="form.email" type="email" required
                                                    placeholder="j.doe@system.com"
                                                    class="w-full shadow-sm rounded-xl" />
                                            </div>

                                            <div class="flex flex-col">
                                                <label class="block text-xs font-bold text-slate-500 mb-2 pl-2">Security
                                                    Key (Password)</label>
                                                <InputText v-model="form.password" type="password"
                                                    :required="!isEditing" placeholder="••••••••"
                                                    class="w-full shadow-sm rounded-xl font-mono" />
                                                <p v-if="isEditing"
                                                    class="text-xs text-slate-400 mt-2 font-bold italic pl-2">Leave
                                                    blank to maintain current encryption</p>
                                            </div>

                                            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div class="flex flex-col">
                                                    <label
                                                        class="block text-xs font-bold text-slate-500 mb-2 pl-2">Global
                                                        Phone</label>
                                                    <InputText v-model="form.phone" placeholder="+XX XXX XXX XXXX"
                                                        class="w-full shadow-sm rounded-xl" />
                                                </div>
                                                <div class="flex flex-col">
                                                    <label
                                                        class="block text-xs font-bold text-slate-500 mb-2 pl-2">National
                                                        Origin</label>
                                                    <InputText v-model="form.country" placeholder="EGYPT"
                                                        class="w-full shadow-sm rounded-xl uppercase" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </template>
                            </Card>

                            <!-- Status Management -->
                            <Card class="border border-slate-100 shadow-sm rounded-[2.5rem]">
                                <template #content>
                                    <div class="space-y-6 p-4">
                                        <div class="flex items-center space-x-4">
                                            <div class="w-1.5 h-6 bg-slate-200 rounded-full"></div>
                                            <h3 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">
                                                Account Status</h3>
                                        </div>

                                        <label class="flex items-center cursor-pointer group w-fit">
                                            <Checkbox v-model="form.is_active" :binary="true" />
                                            <div class="ml-4">
                                                <span
                                                    class="block text-xs font-bold text-slate-700 uppercase tracking-wider group-hover:text-emerald-600 transition">
                                                    {{ form.is_active ? 'Active Node' : 'Deactivated' }}
                                                </span>
                                                <span
                                                    class="block text-[10px] text-slate-400 font-bold tracking-tight">Access
                                                    is granted while active</span>
                                            </div>
                                        </label>
                                    </div>
                                </template>
                            </Card>

                            <!-- Partner Specific Details -->
                            <div v-if="form.role === 'partner'"
                                class="lg:col-span-2 space-y-8 animate-in fade-in slide-in-from-top-2 duration-500">
                                <Card class="border border-slate-100 shadow-sm rounded-[2.5rem] bg-indigo-50/10">
                                    <template #content>
                                        <div class="space-y-8 p-4">
                                            <div class="flex items-center space-x-4">
                                                <div class="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                                                <h3 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">
                                                    Institutional Partner Profile</h3>
                                            </div>

                                            <div class="space-y-8">
                                                <div class="flex flex-col">
                                                    <label class="block text-xs font-bold text-slate-500 mb-2 pl-2">Organizational Identity</label>
                                                    <InputText v-model="form.partner_name" placeholder="ENTER PARTNER NAME" class="w-full shadow-sm rounded-xl uppercase" />
                                                </div>

                                                <div class="flex flex-col">
                                                    <label class="block text-xs font-bold text-slate-500 mb-2 pl-2">Digital Portal (Website)</label>
                                                    <InputText v-model="form.website" placeholder="https://www.example.com" class="w-full shadow-sm rounded-xl" />
                                                </div>

                                                <div class="flex flex-col">
                                                    <label class="block text-xs font-bold text-slate-500 mb-2 pl-2">Strategic Notes</label>
                                                    <InputText v-model="form.note" placeholder="INTERNAL PARTNERSHIP METADATA" class="w-full shadow-sm rounded-xl" />
                                                </div>

                                                <!-- Proctoring Toggle -->
                                                <div class="pt-2 border-t border-slate-100">
                                                    <label class="flex items-center gap-4 cursor-pointer group w-fit">
                                                        <div class="relative">
                                                            <input type="checkbox" v-model="form.proctoring_required" class="sr-only">
                                                            <div :class="form.proctoring_required ? 'bg-violet-600' : 'bg-slate-200'" class="block w-12 h-7 rounded-full transition-colors duration-300"></div>
                                                            <div :class="form.proctoring_required ? 'translate-x-6' : 'translate-x-1'" class="absolute left-0 top-1 bg-white w-5 h-5 rounded-full transition-transform duration-300 shadow-sm"></div>
                                                        </div>
                                                        <div>
                                                            <span class="block text-xs font-black text-slate-700 uppercase tracking-wider">Proctoring Required</span>
                                                            <span class="block text-[10px] text-slate-400 font-bold mt-0.5">
                                                                {{ form.proctoring_required ? 'Students must complete identity & camera verification' : 'Students see system requirements check only' }}
                                                            </span>
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </template>
                                </Card>
                            </div>
                        </div>

                        <!-- Sidebar: Role Selection -->
                        <div class="space-y-8">

                            <div class="p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] shadow-sm space-y-8">
                                <div class="flex items-center space-x-4">
                                    <div class="w-1.5 h-6 bg-brand-primary rounded-full"></div>
                                    <h3 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Permission
                                        Tier</h3>
                                </div>

                                <div class="space-y-4">
                                    <label v-for="r in roles" :key="r.value"
                                        class="block p-5 rounded-2xl border-2 transition-all cursor-pointer group flex items-start space-x-4"
                                        :class="form.role === r.value ? 'bg-white border-brand-primary shadow-md' : 'bg-white/50 border-transparent hover:border-slate-200'">
                                        <RadioButton v-model="form.role" :inputId="r.value" :value="r.value"
                                            class="mt-1" />
                                        <div class="flex flex-col">
                                            <span class="text-xs font-bold tracking-wider mb-1"
                                                :class="form.role === r.value ? 'text-brand-primary' : 'text-slate-600'">{{
                                                r.label }}</span>
                                            <span class="text-[10px] font-medium"
                                                :class="form.role === r.value ? 'text-indigo-400' : 'text-slate-400'">{{
                                                r.desc }}</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <Button type="submit"
                                :label="isSubmitting ? 'PERSISTING...' : (isEditing ? 'UPDATE NODE' : 'ACTIVE NODE')"
                                :icon="isSubmitting ? 'pi pi-spin pi-spinner' : 'pi pi-check'" size="large"
                                class="w-full text-sm font-bold shadow-md rounded-[1.5rem]" />
                        </div>

                    </div>
                </form>
            </div>
        </div>
    </AdminLayout>
</template>

<style scoped>
.premium-card {
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.premium-input {
    outline: none;
}
</style>
