<script setup>
import { ref, onMounted } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

const students = ref([]);
const packages = ref([]);
const loading = ref(true);
const isSaving = ref(false);
const skills = ref([]);

const showEditModal = ref(false);
const showViewModal = ref(false);
const selectedStudent = ref(null);

const editForm = ref({
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
    package_id: '',
    exam_type: 'adult',
    assigned_skills: [],
    password: '',
    is_active: true,
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
    selectedStudent.value = student;
    showViewModal.value = true;
};

const openEdit = (student) => {
    selectedStudent.value = student;
    editForm.value = {
        first_name: student.user?.first_name || '',
        last_name: student.user?.last_name || '',
        email: student.user?.email || '',
        phone: student.user?.phone || '',
        gender: student.user?.gender || 'male',
        birth_date: student.user?.birth_date || '',
        address: student.user?.address || '',
        city: student.user?.city || '',
        country: student.user?.country || '',
        religion: student.user?.religion || '',
        occupation: student.user?.occupation || '',
        student_code: student.student_code || '',
        come_from: student.come_from || '',
        student_type: student.student_type || '',
        year_of_arabic: student.year_of_arabic,
        not_adaptive: !!student.not_adaptive,
        is_active: !!student.is_active,
        package_id: student.package_id || '',
        exam_type: student.exam_type || 'adult',
        assigned_skills: student.assigned_skills || [],
        is_active: !!student.user?.is_active,
        password: '',
    };
    showEditModal.value = true;
};

const deleteStudent = async (student) => {
    const fullName = `${student.user?.first_name} ${student.user?.last_name}`;
    if (!confirm(`Are you sure you want to permanently delete student: ${fullName}? This will also delete their User account and all exam history.`)) return;

    try {
        await api.delete(`/admin/students/${student.id}`);
        students.value = students.value.filter(s => s.id !== student.id);
        alert('Student successfully purged from system.');
    } catch (err) {
        alert('Failed to delete student.');
    }
};

const onPackageChange = () => {
    const selected = packages.value.find(p => p.id === editForm.value.package_id);
    if (selected && selected.skills) {
        editForm.value.assigned_skills = selected.skills.map(s => s.id);
    }
};

// const saveStudent = async () => {
//     isSaving.value = true;
//     try {
//         const res = await api.patch(`/admin/students/${selectedStudent.value.id}`, editForm.value);
//         const index = students.value.findIndex(s => s.id === selectedStudent.value.id);
//         if (index !== -1) {
//             students.value[index] = res.data.student;
//         }
//         showEditModal.value = false;
//         alert('Identity profile updated successfully.');
//     } catch (err) {
//         alert(err.response?.data?.message || 'Failed to update identity.');
//     } finally {
//         isSaving.value = false;
//     }
// };


const saveStudent = async () => {
    isSaving.value = true;
    try {
        const payload = {
            ...editForm.value,
            is_active: editForm.value.is_active ? 1 : 0
        };

        const res = await api.patch(
            `/admin/students/${selectedStudent.value.id}`,
            payload
        );

        const index = students.value.findIndex(s => s.id === selectedStudent.value.id);
        if (index !== -1) {
            students.value[index] = res.data.student;
        }

        showEditModal.value = false;
        alert('Identity profile updated successfully.');
    } catch (err) {
        alert(err.response?.data?.message || 'Failed to update identity.');
    } finally {
        isSaving.value = false;
    }
};



const getSourceStyles = (source) => {
    switch (source) {
        case 'wordpress': return 'bg-blue-50 text-blue-600 border-blue-100';
        case 'batch': return 'bg-purple-50 text-purple-600 border-purple-100';
        default: return 'bg-slate-50 text-slate-500 border-slate-100';
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
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            <!-- Header -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
                <div>
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight">Student Hub</h1>
                    <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Lifecycle management
                        for registered entities</p>
                </div>
                <div class="flex items-center space-x-4">
                    <router-link to="/admin/students/batch"
                        class="bg-white border border-slate-200 text-slate-500 font-black text-[10px] tracking-widest uppercase px-6 py-3.5 rounded-xl hover:border-indigo-100 hover:text-indigo-600 transition shadow-sm">
                        Bulk Import (XLS)
                    </router-link>
                    <router-link to="/admin/students/create"
                        class="bg-slate-900 text-white font-black text-[10px] tracking-widest uppercase px-8 py-3.5 rounded-xl shadow-lg shadow-slate-200 hover:bg-black active:scale-95 transition-all">
                        Register Entity +
                    </router-link>
                </div>
            </div>

            <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
                <div class="w-12 h-12 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Database...</p>
            </div>

            <div v-else
                class="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead class="bg-slate-50/50 text-slate-300 text-[10px] uppercase font-black tracking-[0.2em]">
                            <tr>
                                <th class="px-10 py-8">IDENTITY INFO</th>
                                <th class="px-10 py-8">SUBSCRIPTION</th>
                                <th class="px-10 py-8">LOGIC_MODE</th>
                                <th class="px-10 py-8">STATUS</th>
                                <th class="px-10 py-8">ACTIVE</th>
                                <th class="px-10 py-8 text-right">OPERATIONS</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50 text-sm">
                            <tr v-for="student in students" :key="student.id"
                                class="hover:bg-slate-50/50 transition-colors group">
                                <td class="px-10 py-6">
                                    <div class="flex items-center space-x-5">
                                        <div
                                            class="w-14 h-14 rounded-2xl bg-slate-100 text-slate-300 flex items-center justify-center font-black group-hover:bg-slate-900 group-hover:text-white transition-all transform group-hover:-rotate-3 shadow-sm border border-slate-50">
                                            {{ student.user?.first_name ? student.user.first_name[0] : 'S' }}
                                        </div>
                                        <div>
                                            <div @click="openView(student)"
                                                class="font-black text-slate-700 text-lg tracking-tight leading-tight hover:text-indigo-600 cursor-pointer transition-colors">
                                                {{ student.user?.first_name }} {{ student.user?.last_name }}
                                            </div>
                                            <div class="flex items-center space-x-2 mt-1.5">
                                                <span
                                                    class="text-[10px] font-bold text-slate-300 tracking-wider font-mono">{{
                                                        student.user?.email }}</span>
                                                <span class="w-1 h-1 bg-slate-200 rounded-full"></span>
                                                <span
                                                    class="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{{
                                                        student.student_code || 'UNCODED' }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-10 py-6">
                                    <div v-if="student.package"
                                        class="bg-indigo-50 text-indigo-600 border border-indigo-100 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest inline-block shadow-sm">
                                        {{ student.package.name }}
                                    </div>
                                    <div v-else
                                        class="text-[9px] font-black text-slate-300 uppercase tracking-widest pl-2">
                                        Custom_Asset</div>
                                </td>
                                <td class="px-10 py-6">
                                    <div class="flex flex-col space-y-1">
                                        <span
                                            :class="student.exam_type === 'adult' ? 'text-emerald-500' : 'text-orange-500'"
                                            class="text-[10px] font-black uppercase tracking-widest">
                                            {{ student.exam_type }}
                                        </span>
                                        <span v-if="student.not_adaptive"
                                            class="text-[8px] font-bold text-amber-400 uppercase tracking-tighter italic">Non-Adaptive</span>
                                    </div>
                                </td>
                                <td class="px-10 py-6">
                                    <span :class="getSourceStyles(student.registration_source)"
                                        class="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm">
                                        {{ student.registration_source }}
                                    </span>
                                </td>
                                <td class="px-10 py-6">
                                    <span :class="student.user?.is_active ? 'text-emerald-500' : 'text-slate-300'"
                                        class="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm">
                                        {{ student.user?.is_active ? 'Active' : 'Inactive' }}
                                    </span>
                                </td>
                                <td class="px-10 py-6 text-right">
                                    <div class="flex items-center justify-end space-x-2">
                                        <button @click="openView(student)"
                                            class="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center border border-blue-100 shadow-sm"
                                            title="View Details">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        </button>
                                        <button @click="openEdit(student)"
                                            class="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 hover:bg-amber-600 hover:text-white transition-all flex items-center justify-center border border-amber-100 shadow-sm"
                                            title="Edit Profile">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button @click="deleteStudent(student)"
                                            class="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center border border-rose-100 shadow-sm"
                                            title="Purge Identity">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3"
                                                    d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            <tr v-if="students.length === 0">
                                <td colspan="5"
                                    class="py-32 text-center text-slate-300 font-black uppercase tracking-[0.2em] text-[10px]">
                                    Registry Empty. No identities discovered.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- View Student Details Modal -->
        <div v-if="showViewModal"
            class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-300">
            <div
                class="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in slide-in-from-bottom-8 duration-500">
                <div
                    class="px-12 py-10 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center shrink-0">
                    <div class="flex items-center space-x-6">
                        <div
                            class="w-20 h-20 rounded-[2rem] bg-slate-900 text-white flex items-center justify-center text-3xl font-black shadow-xl shadow-slate-200">
                            {{ selectedStudent.user?.first_name[0] }}
                        </div>
                        <div>
                            <h3 class="text-3xl font-black text-slate-800 tracking-tight">{{
                                selectedStudent.user?.first_name }} {{ selectedStudent.user?.last_name }}</h3>
                            <div class="flex items-center space-x-3 mt-1.5">
                                <span
                                    class="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-indigo-100">Student_ID:
                                    {{ selectedStudent.student_code || 'N/A' }}</span>
                                <span class="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Parent_Key:
                                    {{ selectedStudent.parent_code }}</span>
                            </div>
                        </div>
                    </div>
                    <button @click="showViewModal = false"
                        class="w-14 h-14 rounded-full bg-white border border-slate-100 text-slate-400 hover:text-slate-900 flex items-center justify-center transition-all shadow-sm">✕</button>
                </div>

                <div class="p-12 overflow-y-auto no-scrollbar space-y-12">
                    <!-- Data Grid -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div class="space-y-8">
                            <h4
                                class="text-[11px] font-black text-indigo-500 uppercase tracking-[0.3em] flex items-center">
                                <span class="w-2 h-2 bg-indigo-500 rounded-full mr-3"></span> Identity Profile
                            </h4>
                            <div class="grid grid-cols-2 gap-6">
                                <div v-for="(val, key) in { Email: selectedStudent.user?.email, Phone: selectedStudent.user?.phone || 'N/A', Gender: selectedStudent.user?.gender, Birth: selectedStudent.user?.birth_date || 'N/A' }"
                                    :key="key" class="space-y-1">
                                    <label class="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{{ key
                                    }}</label>
                                    <p class="text-sm font-bold text-slate-700 truncate">{{ val }}</p>
                                </div>
                            </div>
                            <div class="space-y-1">
                                <label class="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Residencial
                                    Address</label>
                                <p class="text-sm font-bold text-slate-700 leading-relaxed">{{
                                    selectedStudent.user?.address || 'UNMAPPED_LOCATION' }}, {{
                                        selectedStudent.user?.city || 'CITY_NULL' }}, {{ selectedStudent.user?.country ||
                                        'PLANET_EARTH' }}</p>
                            </div>
                        </div>

                        <div class="space-y-8">
                            <h4
                                class="text-[11px] font-black text-emerald-500 uppercase tracking-[0.3em] flex items-center">
                                <span class="w-2 h-2 bg-emerald-500 rounded-full mr-3"></span> Academic Sync
                            </h4>
                            <div class="grid grid-cols-2 gap-6">
                                <div v-for="(val, key) in { Package: selectedStudent.package?.name || 'Custom', Mode: selectedStudent.exam_type, Type: selectedStudent.student_type || 'General', Source: selectedStudent.registration_source }"
                                    :key="key" class="space-y-1">
                                    <label class="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{{ key
                                    }}</label>
                                    <p class="text-sm font-bold text-slate-700">{{ val }}</p>
                                </div>
                            </div>
                            <div class="space-y-4">
                                <label class="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Active
                                    Modules</label>
                                <div class="flex flex-wrap gap-2">
                                    <span v-for="skillId in selectedStudent.assigned_skills" :key="skillId"
                                        class="px-3 py-1 bg-slate-900 text-slate-300 rounded-lg text-[9px] font-black uppercase tracking-tighter">
                                        {{skills.find(s => s.id === skillId)?.name || skillId}}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Footer Stats -->
                    <div
                        class="bg-indigo-600 rounded-[2.5rem] p-10 flex justify-around items-center shadow-2xl shadow-indigo-200">
                        <div class="text-center group">
                            <p
                                class="text-indigo-200 text-[10px] font-black uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                Assessment Attempts</p>
                            <p class="text-white text-5xl font-black mt-2">{{ selectedStudent.attempts_count || 0 }}</p>
                        </div>
                        <div class="w-px h-12 bg-indigo-500/50"></div>
                        <div class="text-center group">
                            <p
                                class="text-indigo-200 text-[10px] font-black uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                Registry Data</p>
                            <p class="text-white text-sm font-black mt-2">{{ new
                                Date(selectedStudent.created_at).toLocaleDateString() }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Edit Student Profile Modal -->
        <div v-if="showEditModal"
            class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300">
            <div
                class="bg-white rounded-[3rem] shadow-[0_32px_120px_rgba(0,0,0,0.2)] w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                <div
                    class="px-10 py-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center shrink-0">
                    <div>
                        <h3 class="text-2xl font-black text-slate-800 tracking-tight">Sync Entity</h3>
                        <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest">Manual identity
                            reconciliation</p>
                    </div>
                    <button @click="showEditModal = false"
                        class="w-10 h-10 rounded-full bg-white border border-slate-100 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors shadow-sm">✕</button>
                </div>

                <div class="p-10 space-y-12 overflow-y-auto no-scrollbar">
                    <!-- Section 1: Core -->
                    <div class="space-y-6">
                        <div class="grid grid-cols-2 gap-6">
                            <div>
                                <label
                                    class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Given
                                    Name</label>
                                <input v-model="editForm.first_name" type="text" class="premium-input text-xs uppercase"
                                    placeholder="FIRST_NAME">
                            </div>
                            <div>
                                <label
                                    class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Family
                                    Name</label>
                                <input v-model="editForm.last_name" type="text" class="premium-input text-xs uppercase"
                                    placeholder="LAST_NAME">
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-6">
                            <div>
                                <label
                                    class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Identifier
                                    (Email)</label>
                                <input v-model="editForm.email" type="email" class="premium-input text-xs"
                                    placeholder="EMAIL@DOMAIN.COM">
                            </div>
                            <div>
                                <label
                                    class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Contact
                                    Phone</label>
                                <input v-model="editForm.phone" type="text" class="premium-input text-xs"
                                    placeholder="+XX XXX XXXX">
                            </div>
                        </div>
                    </div>

                    <!-- Section 2: Bio -->
                    <div class="grid grid-cols-2 gap-6">
                        <div>
                            <label
                                class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Belief
                                System (Religion)</label>
                            <input v-model="editForm.religion" type="text" class="premium-input text-xs uppercase"
                                placeholder="RELIGION">
                        </div>
                        <div>
                            <label
                                class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Core
                                Profession</label>
                            <input v-model="editForm.occupation" type="text" class="premium-input text-xs uppercase"
                                placeholder="OCCUPATION">
                        </div>
                    </div>

                    <!-- Section 3: Academic -->
                    <div class="space-y-6 p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100">
                        <div class="grid grid-cols-2 gap-6">
                            <div>
                                <label
                                    class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Assigned
                                    Package</label>
                                <select v-model="editForm.package_id" @change="onPackageChange"
                                    class="premium-input text-[10px] uppercase tracking-widest">
                                    <option value="">CUSTOM_SYNC</option>
                                    <option v-for="pkg in packages" :key="pkg.id" :value="pkg.id">{{ pkg.name }}
                                    </option>
                                </select>
                            </div>
                            <div>
                                <label
                                    class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Logic
                                    Mode</label>
                                <select v-model="editForm.exam_type"
                                    class="premium-input text-[10px] uppercase tracking-widest">
                                    <option value="adult">ADULT (18+)</option>
                                    <option value="children">CHILD (-18)</option>
                                </select>
                            </div>
                        </div>

                        <div class="flex items-center space-x-4">
                            <label class="flex items-center cursor-pointer group">
                                <div class="relative">
                                    <input type="checkbox" v-model="editForm.not_adaptive" class="sr-only">
                                    <div :class="editForm.not_adaptive ? 'bg-amber-500' : 'bg-slate-200'"
                                        class="block w-12 h-7 rounded-full transition-colors"></div>
                                    <div :class="editForm.not_adaptive ? 'translate-x-6' : 'translate-x-1'"
                                        class="absolute left-0 top-1 bg-white w-5 h-5 rounded-full transition-transform shadow-sm">
                                    </div>
                                </div>
                                <span
                                    class="ml-3 text-[10px] font-black text-slate-600 uppercase tracking-widest">Linear
                                    Mode (Non-Adaptive)</span>
                            </label>

                        </div>
                        <div class="flex items-center space-x-4">
                            <label class="flex items-center cursor-pointer group">
                                <div class="relative">
                                    <input type="checkbox" v-model="editForm.is_active" class="sr-only">
                                    <div :class="editForm.is_active ? 'bg-emerald-500' : 'bg-slate-200'"
                                        class="block w-12 h-7 rounded-full transition-colors"></div>
                                    <div :class="editForm.is_active ? 'translate-x-6' : 'translate-x-1'"
                                        class="absolute left-0 top-1 bg-white w-5 h-5 rounded-full transition-transform shadow-sm">
                                    </div>
                                </div>
                                <span class="ml-3 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                                    Active Status
                                </span>
                            </label>
                        </div>

                        <div>
                            <label
                                class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-4">Cognitive
                                Module Matrix</label>
                            <div class="grid grid-cols-2 gap-3">
                                <label v-for="skill in skills" :key="skill.id"
                                    :class="editForm.assigned_skills.includes(skill.id) ? 'border-indigo-400 bg-white ring-4 ring-indigo-50 shadow-sm' : 'border-slate-50 bg-white/50'"
                                    class="flex items-center p-4 rounded-2xl border cursor-pointer hover:border-indigo-200 transition-all duration-300 group">
                                    <input type="checkbox" :value="skill.id" v-model="editForm.assigned_skills"
                                        class="w-5 h-5 text-indigo-600 rounded-lg border-slate-200 bg-white shadow-inner focus:ring-0">
                                    <span
                                        :class="editForm.assigned_skills.includes(skill.id) ? 'text-indigo-600 font-black' : 'text-slate-500 font-bold'"
                                        class="ml-3 text-[9px] uppercase tracking-wider transition-colors">
                                        {{ skill.name }}
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- Password -->
                    <div>
                        <label
                            class="block text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2 ml-4">Credential
                            Override (Passphrase)</label>
                        <input v-model="editForm.password" type="password"
                            placeholder="LEAVE BLANK TO RETAIN CURRENT KEY"
                            class="premium-input font-mono text-xs tracking-widest text-center bg-slate-50 border-dashed">
                    </div>
                </div>

                <!-- Footer -->
                <div class="p-10 bg-white border-t border-slate-50 flex justify-end space-x-4 shrink-0">
                    <button @click="showEditModal = false"
                        class="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition">Discard</button>
                    <button @click="saveStudent" :disabled="isSaving"
                        class="bg-slate-900 text-white font-black px-12 py-5 rounded-[1.5rem] shadow-xl shadow-slate-200 hover:bg-black active:scale-95 transition-all uppercase tracking-[0.2em] text-[10px]">
                        {{ isSaving ? 'SYNCHRONIZING...' : 'COMMIT CHANGES' }}
                    </button>
                </div>
            </div>
        </div>
    </AdminLayout>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
</style>
