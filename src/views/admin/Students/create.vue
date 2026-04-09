<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

const router = useRouter();

// Generate a random 6-character alphanumeric password suggestion
const generatePassword = () => {
    return Math.random().toString(36).slice(-6).toUpperCase();
};

const packages = ref([]);
const skills = ref([]);
const partners = ref([]);

const form = ref({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: 'male',
    birth_date: '',
    address: '',
    city: '',
    country: '',
    religion: '',
    occupation: '',
    student_code: '',
    come_from: '',
    student_type: '',
    year_of_arabic: null,
    not_adaptive: false,
    password: generatePassword(),
    package_id: '',
    exam_type: 'adult',
    assigned_skills: [],
    is_active: true,        // ✅ جديد
    partner_id: '',

});

const isSubmitting = ref(false);
const errorMsg = ref('');

onMounted(async () => {
    try {
        const [pkgRes, skillRes, partnerRes] = await Promise.all([
            api.get('/admin/packages'),
            api.get('/admin/skills'),
            api.get('/admin/partners/active')
        ]);
        packages.value = pkgRes.data;
        skills.value = skillRes.data;
        partners.value = partnerRes.data;

        // Start with custom
        form.value.package_id = '';
        if (partners.value.length > 0) form.value.partner_id = partners.value[0].id; // اختياري

        // Default skills (Listening, Reading, Structure)
        form.value.assigned_skills = skills.value
            .filter(s => ['Listening', 'Reading', 'Structure'].includes(s.name))
            .map(s => s.id);
    } catch (err) {
        console.error('Failed to load prerequisites', err);
    }
});

const addStudent = async () => {
    isSubmitting.value = true;
    errorMsg.value = '';

    try {
        await api.post('/admin/students', form.value);
        alert('Student successfully registered!');
        router.push('/admin/students');
    } catch (err) {
        console.error(err);
        errorMsg.value = err.response?.data?.message || 'Failed to add student. Ensure email and student code are unique.';
    } finally {
        isSubmitting.value = false;
    }
};

const onPackageChange = () => {
    if (form.value.package_id !== '') {
        const selected = packages.value.find(p => p.id === form.value.package_id);
        if (selected && selected.skills) {
            // Auto-select skills from the package and prevent manual edit
            form.value.assigned_skills = selected.skills.map(s => s.id);
        }
    }
};
</script>

<template>
    <AdminLayout>
        <div class="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">

            <!-- Header -->
            <div class="flex items-center space-x-6">
                <router-link to="/admin/students"
                    class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-slate-400 hover:text-indigo-600 hover:shadow-md transition-all border border-slate-100 group">
                    <svg class="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none"
                        stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7" />
                    </svg>
                </router-link>
                <div>
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight">Provision Identity</h1>
                    <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Manual Entity
                        Onboarding</p>
                </div>
            </div>

            <div class="premium-card p-10 md:p-16 relative overflow-hidden">
                <!-- Decorative Accent -->
                <div class="absolute -right-24 -top-24 w-64 h-64 bg-indigo-50/30 rounded-full blur-3xl"></div>

                <form @submit.prevent="addStudent" class="relative z-10 space-y-16">

                    <div v-if="errorMsg"
                        class="bg-rose-50 border border-rose-100 text-rose-500 text-[10px] font-black uppercase tracking-widest p-5 rounded-2xl animate-in slide-in-from-top-2">
                        ⚠️ PROVISIONING_ERROR: {{ errorMsg }}
                    </div>

                    <!-- ── CORE IDENTITY SECTION ── -->
                    <div class="space-y-8">
                        <div class="flex items-center space-x-4 mb-4">
                            <div class="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                            <h3 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Core Identity</h3>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label
                                    class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Given
                                    Name</label>
                                <input v-model="form.first_name" type="text" required
                                    class="premium-input uppercase text-sm" placeholder="FIRST_NAME">
                            </div>
                            <div>
                                <label
                                    class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Family
                                    Name</label>
                                <input v-model="form.last_name" type="text" required
                                    class="premium-input uppercase text-sm" placeholder="LAST_NAME">
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label
                                    class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Identifier
                                    (Email)</label>
                                <input v-model="form.email" type="email" required
                                    class="premium-input font-bold text-sm tracking-wide"
                                    placeholder="IDENTITY@DOMAIN.COM">
                            </div>
                            <div>
                                <label
                                    class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Contact
                                    Phone</label>
                                <input v-model="form.phone" type="text" class="premium-input text-sm"
                                    placeholder="+XX XXX XXX XXXX">
                            </div>
                        </div>
                    </div>

                    <!-- ── PROFILE METADATA SECTION ── -->
                    <div class="space-y-8 p-10 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                        <div class="flex items-center space-x-4 mb-4">
                            <div class="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                            <h3 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Profile Metadata
                            </h3>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div>
                                <label
                                    class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Birth
                                    Date</label>
                                <input v-model="form.birth_date" type="date"
                                    class="premium-input text-xs uppercase cursor-pointer">
                            </div>
                            <div>
                                <label
                                    class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Gender
                                    Profile</label>
                                <select v-model="form.gender"
                                    class="premium-input text-[10px] uppercase tracking-widest cursor-pointer">
                                    <option value="male">MALE_IDENTITY</option>
                                    <option value="female">FEMALE_IDENTITY</option>
                                    <option value="other">OTHER_VARIANT</option>
                                </select>
                            </div>
                            <div>
                                <label
                                    class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Religion/Belief</label>
                                <input v-model="form.religion" type="text" class="premium-input text-sm uppercase"
                                    placeholder="BELIEF_SYSTEM">
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label
                                    class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Professional
                                    Occupation</label>
                                <input v-model="form.occupation" type="text" class="premium-input text-sm uppercase"
                                    placeholder="CORE_PROFESSION">
                            </div>
                            <div>
                                <label
                                    class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">State/Province</label>
                                <input v-model="form.city" type="text" class="premium-input text-sm uppercase"
                                    placeholder="OPERATIONAL_CITY">
                            </div>
                        </div>

                        <div>
                            <label
                                class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Physical
                                Residency</label>
                            <input v-model="form.address" type="text" class="premium-input text-sm uppercase"
                                placeholder="FULL_STREET_RESIDENCY">
                        </div>
                    </div>

                    <!-- ── ACADEMIC CONTEXT SECTION ── -->
                    <div class="space-y-8">
                        <div class="flex items-center space-x-4 mb-4">
                            <div class="w-1.5 h-6 bg-purple-600 rounded-full"></div>
                            <h3 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Academic Context
                            </h3>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label
                                    class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4 ml-6 flex items-center">
                                    Student Code
                                    <span
                                        class="ml-2 px-1.5 py-0.5 bg-indigo-50 text-indigo-400 rounded text-[8px]">Unique</span>
                                </label>
                                <input v-model="form.student_code" type="text" class="premium-input text-sm uppercase"
                                    placeholder="REG_XXXXX">
                            </div>
                            <div>
                                <label
                                    class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Referral
                                    Source (Come From)</label>
                                <input v-model="form.come_from" type="text" class="premium-input text-sm uppercase"
                                    placeholder="WP_REF / DIRECT / SOCIAL">
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div>
                                <label
                                    class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Entity
                                    Type</label>
                                <input v-model="form.student_type" type="text" class="premium-input text-sm uppercase"
                                    placeholder="SCHOLAR / CORPORATE">
                            </div>
                            <div>
                                <label
                                    class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Years
                                    Study (Arabic)</label>
                                <input v-model="form.year_of_arabic" type="number" class="premium-input text-sm"
                                    placeholder="0">
                            </div>
                            <div class="flex flex-col justify-end pb-2">
                                <label class="flex items-center cursor-pointer group">
                                    <div class="relative">
                                        <input type="checkbox" v-model="form.not_adaptive" class="sr-only">
                                        <div :class="form.not_adaptive ? 'bg-amber-500' : 'bg-slate-200'"
                                            class="block w-14 h-8 rounded-full transition-colors"></div>
                                        <div :class="form.not_adaptive ? 'translate-x-6' : 'translate-x-1'"
                                            class="absolute left-0 top-1 bg-white w-6 h-6 rounded-full transition-transform shadow-sm">
                                        </div>
                                    </div>
                                    <div class="ml-4">
                                        <span
                                            class="block text-[10px] font-black text-slate-800 uppercase tracking-widest">Disable
                                            Adaptive Mode</span>
                                        <span
                                            class="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Linear
                                            Assessment (Static Sequence)</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                            <div>
                                <label
                                    class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Subscription
                                    Package</label>
                                <select v-model="form.package_id" @change="onPackageChange"
                                    class="premium-input text-xs uppercase tracking-widest cursor-pointer">
                                    <option value="">-- CUSTOM_PROVISIONING --</option>
                                    <option v-for="pkg in packages" :key="pkg.id" :value="pkg.id">
                                        {{ pkg.name }} ({{ pkg.skills_count }} MODULES)
                                    </option>
                                </select>
                            </div>
                            <div>
                                <label
                                    class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Cognitive
                                    Mode</label>
                                <select v-model="form.exam_type" required
                                    class="premium-input text-xs uppercase tracking-widest cursor-pointer">
                                    <option value="adult">ADULT_COGNITION (18+)</option>
                                    <option value="children">PEDIATRIC_COGNITION (-18)</option>
                                </select>
                            </div>
                        </div>

                        <!-- Skill Selection Grid -->
                        <div class="p-8 bg-slate-900 rounded-[2.5rem] shadow-2xl">
                            <div class="flex items-center justify-between mb-8">
                                <label
                                    class="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center">
                                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Cognitive Module Matrix
                                </label>
                                <span v-if="form.package_id === ''" class="text-[9px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">Custom Selection Enabled</span>
                                <span v-else class="text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">Locked to Package</span>
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <label v-for="skill in skills" :key="skill.id"
                                    :class="[
                                        form.assigned_skills.includes(skill.id) ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-800 bg-slate-800/50',
                                        form.package_id !== '' ? 'opacity-60 cursor-not-allowed grayscale-[30%]' : 'cursor-pointer hover:border-emerald-500/30'
                                    ]"
                                    class="flex items-center p-5 rounded-2xl border-2 transition-all duration-300 group">
                                    <input type="checkbox" :value="skill.id" v-model="form.assigned_skills"
                                        :disabled="form.package_id !== ''"
                                        class="w-5 h-5 text-emerald-500 rounded-lg border-slate-700 bg-slate-900 focus:ring-0 focus:ring-offset-0 disabled:opacity-50">
                                    <span
                                        :class="form.assigned_skills.includes(skill.id) ? 'text-emerald-400 font-black' : 'text-slate-500 font-bold'"
                                        class="ml-4 text-[10px] uppercase tracking-wider transition-colors truncate">
                                        {{ skill.name }}
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- ── SECURITY SEGMENT ── -->
                    <div class="space-y-8">
                        <div class="flex items-center space-x-4 mb-4">
                            <div class="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                            <h3 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Access Security
                            </h3>
                        </div>

                        <div>
                            <label
                                class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4 flex justify-between items-center">
                                <span>Initial Session Key</span>
                                <button type="button" @click="form.password = generatePassword()"
                                    class="text-[9px] text-indigo-600 hover:text-indigo-800 font-black uppercase tracking-widest focus:outline-none bg-indigo-50 px-3 py-1 rounded-lg">Regenerate
                                    Key</button>
                            </label>
                            <input v-model="form.password" type="text" required minlength="6"
                                class="premium-input bg-indigo-50 border-indigo-100 text-indigo-600 font-mono font-black text-lg tracking-[0.3em] uppercase text-center focus:bg-white transition-all">
                            <p class="text-[10px] text-slate-400 mt-3 font-bold uppercase tracking-widest text-center">
                                Protocol recommendation: Distribute key only after successful registration.</p>
                        </div>

                        <!-- Partner Selection -->
                        <div>
                            <label
                                class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Partner</label>
                            <select v-model="form.partner_id"
                                class="premium-input text-xs uppercase tracking-widest cursor-pointer">
                                <option v-for="p in partners" :key="p.id" :value="p.id">
                                    {{ p.partner_name }}
                                </option>
                            </select>
                        </div>

                        <!-- Active Status Toggle -->
                        <div class="flex items-center mt-4">
                            <label class="flex items-center cursor-pointer group">
                                <div class="relative">
                                    <input type="checkbox" v-model="form.is_active" class="sr-only">
                                    <div :class="form.is_active ? 'bg-emerald-500' : 'bg-slate-200'"
                                        class="block w-14 h-8 rounded-full transition-colors"></div>
                                    <div :class="form.is_active ? 'translate-x-6' : 'translate-x-1'"
                                        class="absolute left-0 top-1 bg-white w-6 h-6 rounded-full transition-transform shadow-sm">
                                    </div>
                                </div>
                                <div class="ml-4">
                                    <span
                                        class="block text-[10px] font-black text-slate-800 uppercase tracking-widest">Active
                                        Student</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <!-- Final Commit -->
                    <div
                        class="pt-10 border-t border-slate-50 flex flex-col md:flex-row items-center justify-between space-y-6 md:space-y-0">
                        <div class="flex items-center space-x-3 opacity-30">
                            <div class="w-2 h-2 bg-slate-400 rounded-full"></div>
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Endorsed by
                                System Authority</span>
                        </div>
                        <button type="submit" :disabled="isSubmitting"
                            class="w-full md:w-auto bg-slate-900 text-white font-black py-6 px-20 rounded-[2rem] shadow-2xl hover:shadow-indigo-500/20 hover:-translate-y-1 active:scale-95 transition-all duration-300 disabled:opacity-50 text-[10px] uppercase tracking-[0.4em]">
                            {{ isSubmitting ? 'PROVISIONING...' : 'COMMIT IDENTITY ➜' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </AdminLayout>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
</style>
