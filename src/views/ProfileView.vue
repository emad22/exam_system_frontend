<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';
import { authStorage } from '@/services/authStorage';
import { useMediaUrl } from '@/composables/useMediaUrl';
import PartnerLayout from '@/components/PartnerLayout.vue';
import AdminLayout from '@/components/AdminLayout.vue';
import Button from 'primevue/button';
import Card from 'primevue/card';
import DatePicker from 'primevue/datepicker';
import Select from 'primevue/select';
import Password from 'primevue/password';
import Message from 'primevue/message';
import Toast from 'primevue/toast';
import InputText from 'primevue/inputtext';
import { useToast } from 'primevue/usetoast';

const router = useRouter();
const toast = useToast();

const user = ref(null);
const isLoading = ref(true);
const isSubmitting = ref(false);
const errorMsg = ref('');

const form = ref({
    first_name: '',
    last_name: '',
    phone: '',
    birth_date: null,
    gender: '',
    address: '',
    city: '',
    state: '',
    country: '',
    occupation: '',
    avatar: null,
    password: '',
    password_confirmation: ''
});

const avatarPreview = ref(null);

const fetchProfile = async () => {
    try {
        const res = await api.get('/user');
        user.value = res.data;

        // Populate form
        Object.keys(form.value).forEach(key => {
            if (key !== 'avatar' && key !== 'password' && key !== 'password_confirmation') {
                form.value[key] = user.value[key] || '';
            }
        });

        if (user.value.birth_date) {
            form.value.birth_date = new Date(user.value.birth_date);
        }

        if (user.value.avatar) {
            avatarPreview.value = resolveUrl(user.value.avatar);
        }
    } catch (err) {
        console.error('Failed to load profile', err);
        errorMsg.value = 'Failed to load profile data.';
    } finally {
        isLoading.value = false;
    }
};

onMounted(fetchProfile);


const onFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
        form.value.avatar = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            avatarPreview.value = e.target.result;
        };
        reader.readAsDataURL(file);
    }
};

const updateProfile = async () => {
    isSubmitting.value = true;
    errorMsg.value = '';

    try {
        const formData = new FormData();
        formData.append('_method', 'PATCH');

        // Append all fields
        Object.keys(form.value).forEach(key => {
            if (form.value[key] !== null && form.value[key] !== '') {
                if (key === 'birth_date') {
                    const d = form.value[key];
                    const formatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    formData.append(key, formatted);
                } else if (key === 'avatar') {
                    if (form.value[key] instanceof File) {
                        formData.append(key, form.value[key]);
                    }
                } else {
                    formData.append(key, form.value[key]);
                }
            }
        });

        await api.post('/profile', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        toast.add({ severity: 'success', summary: 'Success', detail: 'Profile updated successfully', life: 3000 });
        setTimeout(() => {
            if (isStudent.value) {
                window.location.href = '/dashboard';
            } else if (isPartner.value) {
                window.location.href = '/partner';
            } else {
                window.location.href = user.value?.role === 'teacher' ? '/teacher' : '/admin';
            }
        }, 1000);
        // Reset password fields
        form.value.password = '';
        form.value.password_confirmation = '';
    } catch (err) {
        console.error(err);
        errorMsg.value = err.response?.data?.message || 'Failed to update profile.';
        toast.add({ severity: 'error', summary: 'Error', detail: errorMsg.value, life: 5000 });
    } finally {
        isSubmitting.value = false;
    }
};

const { resolveUrl } = useMediaUrl();

const initialRole = authStorage.getRole();
const isStudent = computed(() => {
    const role = user.value?.role || initialRole;
    return role === 'student';
});

const isPartner = computed(() => {
    const role = user.value?.role || initialRole;
    return role === 'partner';
});

const layoutComponent = computed(() => {
    if (isStudent.value) return 'div';
    if (isPartner.value) return PartnerLayout;
    return AdminLayout;
});

const backToDashboard = () => {
    if (isStudent.value) {
        router.push('/dashboard');
    } else if (isPartner.value) {
        router.push('/partner');
    } else {
        router.push(user.value?.role === 'teacher' ? '/teacher' : '/admin');
    }
};
</script>

<template>
    <component :is="layoutComponent">
        <div :class="[isStudent ? 'max-w-4xl mx-auto py-12 px-6' : 'mt-6 px-4']"
            class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            <Toast />

            <!-- Header -->
            <div class="flex items-center justify-between bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                <div class="flex items-center space-x-6">
                    <Button icon="pi pi-arrow-left" severity="secondary" outlined rounded @click="backToDashboard" />
                    <div>
                        <h1 class="text-2xl font-black text-slate-800 tracking-tight">Edit Profile</h1>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manage your
                            personal information and security</p>
                    </div>
                </div>
                <div
                    class="hidden md:flex items-center space-x-2 bg-brand-primary/5 px-4 py-2 rounded-2xl border border-brand-primary/10">
                    <div class="w-2 h-2 bg-brand-primary rounded-full animate-pulse"></div>
                    <span class="text-[10px] font-black text-brand-primary uppercase tracking-widest">{{ user?.role }}
                        Account</span>
                </div>
            </div>

            <div v-if="isLoading" class="flex flex-col items-center justify-center py-20">
                <div class="w-10 h-10 border-4 border-slate-100 border-t-brand-primary rounded-full animate-spin"></div>
                <p class="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading secure data...
                </p>
            </div>

            <form v-else @submit.prevent="updateProfile" class="grid grid-cols-1 lg:grid-cols-3 gap-8">

                <!-- Left Column: Avatar & Account Info -->
                <div class="lg:col-span-1 space-y-8">
                    <Card class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                        <template #content>
                            <div class="p-6 flex flex-col items-center text-center">
                                <div class="relative group">
                                    <div
                                        class="w-32 h-32 rounded-3xl bg-slate-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-xl mb-6 transition-transform group-hover:scale-105 duration-500">
                                        <img v-if="avatarPreview" :src="avatarPreview"
                                            class="w-full h-full object-cover" />
                                        <i v-else class="pi pi-user text-slate-300 text-4xl"></i>
                                    </div>
                                    <label
                                        class="absolute bottom-4 right-0 w-10 h-10 bg-brand-primary text-white rounded-xl shadow-lg flex items-center justify-center cursor-pointer hover:bg-brand-secondary transition-colors border-4 border-white">
                                        <i class="pi pi-camera text-sm"></i>
                                        <input type="file" @change="onFileSelect" accept="image/*" class="hidden" />
                                    </label>
                                </div>
                                <h3 class="text-lg font-black text-slate-800">{{ user?.name || user?.username }}</h3>
                                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{{
                                    user?.email }}</p>

                                <div class="w-full mt-8 pt-8 border-t border-slate-50 space-y-4">
                                    <div class="flex justify-between items-center text-left">
                                        <span
                                            class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Username</span>
                                        <span class="text-xs font-bold text-slate-600">{{ user?.username }}</span>
                                    </div>
                                    <div class="flex justify-between items-center text-left">
                                        <span
                                            class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</span>
                                        <span class="text-xs font-bold text-slate-600">{{ user?.email }}</span>
                                    </div>
                                    <div class="p-3 bg-amber-50 rounded-xl border border-amber-100 text-left">
                                        <p class="text-[8px] font-bold text-amber-600 uppercase leading-relaxed">
                                            <i class="pi pi-info-circle mr-1"></i> Username and Email are managed by the
                                            institution and cannot be changed here.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </Card>

                    <Card class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-slate-900 text-white">
                        <template #content>
                            <div class="p-6 space-y-6">
                                <div class="flex items-center space-x-3">
                                    <div class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                                        <i class="pi pi-lock text-xs text-brand-accent"></i>
                                    </div>
                                    <h3 class="text-sm font-black uppercase tracking-wider">Security</h3>
                                </div>

                                <div class="space-y-4">
                                    <div class="flex flex-col gap-2">
                                        <label
                                            class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">New
                                            Password</label>
                                        <Password v-model="form.password" toggleMask class="w-full"
                                            inputClass="w-full bg-white/5 border-white/10 text-white rounded-xl focus:border-brand-primary"
                                            placeholder="Leave empty to keep current" />
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <label
                                            class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Confirm
                                            Password</label>
                                        <Password v-model="form.password_confirmation" toggleMask :feedback="false"
                                            class="w-full"
                                            inputClass="w-full bg-white/5 border-white/10 text-white rounded-xl focus:border-brand-primary"
                                            placeholder="Repeat new password" />
                                    </div>
                                </div>
                            </div>
                        </template>
                    </Card>
                </div>

                <!-- Right Columns: Personal Details -->
                <div class="lg:col-span-2 space-y-8">
                    <Card class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                        <template #content>
                            <div class="p-8 space-y-8">
                                <div class="flex items-center space-x-3">
                                    <div
                                        class="w-8 h-8 rounded-lg bg-brand-primary text-white flex items-center justify-center">
                                        <i class="pi pi-user text-xs"></i>
                                    </div>
                                    <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">Identity
                                        Details</h3>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div class="flex flex-col">
                                        <label
                                            class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">First
                                            Name</label>
                                        <InputText v-model="form.first_name"
                                            class="w-full rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all" />
                                    </div>
                                    <div class="flex flex-col">
                                        <label
                                            class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Last
                                            Name</label>
                                        <InputText v-model="form.last_name"
                                            class="w-full rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all" />
                                    </div>
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

                                    <div class="flex flex-col">
                                        <label
                                            class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Phone
                                            Number</label>
                                        <InputText v-model="form.phone"
                                            class="w-full rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all"
                                            placeholder="+1..." />
                                    </div>
                                    <div class="flex flex-col">
                                        <label
                                            class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Gender</label>
                                        <Select v-model="form.gender"
                                            :options="[{ label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }]"
                                            optionLabel="label" optionValue="value"
                                            class="w-full rounded-xl bg-slate-50 border-slate-100" />
                                    </div>
                                </div>



                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div class="flex flex-col">
                                        <label
                                            class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Birth
                                            Date</label>
                                        <DatePicker v-model="form.birth_date" dateFormat="yy-mm-dd" showIcon
                                            class="w-full" inputClass="rounded-xl bg-slate-50 border-slate-100" />
                                    </div>

                                </div>
                            </div>
                        </template>
                    </Card>

                    <Card class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                        <template #content>
                            <div class="p-8 space-y-8">
                                <div class="flex items-center space-x-3">
                                    <div
                                        class="w-8 h-8 rounded-lg bg-brand-primary text-white flex items-center justify-center">
                                        <i class="pi pi-map-marker text-xs"></i>
                                    </div>
                                    <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">Location &
                                        Lifestyle</h3>
                                </div>

                                <div class="grid grid-cols-1 gap-6">
                                    <div class="flex flex-col">
                                        <label
                                            class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Home
                                            Address</label>
                                        <InputText v-model="form.address"
                                            class="w-full rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all" />
                                    </div>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div class="flex flex-col">
                                        <label
                                            class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">City</label>
                                        <InputText v-model="form.city"
                                            class="w-full rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all" />
                                    </div>
                                    <div class="flex flex-col">
                                        <label
                                            class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">State
                                            / Province</label>
                                        <InputText v-model="form.state"
                                            class="w-full rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all" />
                                    </div>
                                    <div class="flex flex-col">
                                        <label
                                            class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Country</label>
                                        <InputText v-model="form.country"
                                            class="w-full rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all" />
                                    </div>
                                </div>
                            </div>
                        </template>
                    </Card>

                    <div class="flex justify-end pt-4">
                        <Button type="submit" label="Save Profile Changes" icon="pi pi-check" :loading="isSubmitting"
                            class="px-12 py-6 rounded-3xl shadow-xl shadow-brand-primary/20 font-black tracking-widest uppercase transition-all hover:scale-105 active:scale-95" />
                    </div>
                </div>
            </form>
        </div>
    </component>
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

:deep(.p-card-body) {
    padding: 0;
}

.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
