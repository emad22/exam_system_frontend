<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import PartnerLayout from '@/components/PartnerLayout.vue';
import api from '@/services/api';

const loading = ref(true);
const students = ref([]);
const summary = ref({ total: 0, booked: 0, not_booked: 0, completed: 0 });
const search = ref('');
const status = ref('');
const page = ref(1);
const lastPage = ref(1);
let filterTimer;

const statusLabels = {
    scheduled: 'مجدول',
    in_progress: 'جارٍ',
    completed: 'مكتمل',
    cancelled: 'ملغى',
    no_show: 'لم يحضر',
};

const fetchStudents = async () => {
    loading.value = true;
    try {
        const { data } = await api.get('/partner/live-speaking/students', {
            params: { search: search.value || undefined, status: status.value || undefined, page: page.value },
        });
        students.value = data.data || [];
        summary.value = data.summary || summary.value;
        lastPage.value = data.meta?.last_page || 1;
    } finally {
        loading.value = false;
    }
};

watch([search, status], () => {
    page.value = 1;
    clearTimeout(filterTimer);
    filterTimer = setTimeout(fetchStudents, 300);
});
watch(page, fetchStudents);
onMounted(fetchStudents);

const statusClass = (value) => ({
    scheduled: 'bg-sky-50 text-sky-700',
    in_progress: 'bg-amber-50 text-amber-700',
    completed: 'bg-emerald-50 text-emerald-700',
    cancelled: 'bg-rose-50 text-rose-700',
    no_show: 'bg-slate-100 text-slate-600',
}[value] || 'bg-slate-100 text-slate-500');

const formatBooking = (booking) => {
    if (!booking) return null;
    return `${booking.slot_date || '-'} · ${booking.start_time || '-'} - ${booking.end_time || '-'}`;
};

const pageLabel = computed(() => `${page.value} / ${lastPage.value}`);
</script>

<template>
    <PartnerLayout>
        <div class="space-y-6" dir="rtl">
            <header class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                    <p class="text-xs font-black uppercase tracking-[0.25em] text-sky-600">Live Speaking</p>
                    <h1 class="text-3xl font-black text-slate-900">متابعة حجوزات المحادثة الحية</h1>
                    <p class="mt-1 text-sm text-slate-500">تابع مواعيد طلابك وحالة المقابلات من مكان واحد.</p>
                </div>
                <button @click="fetchStudents" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
                    <i class="pi pi-refresh ml-2" /> تحديث
                </button>
            </header>

            <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div v-for="item in [
                    { label: 'إجمالي الطلاب', value: summary.total, icon: 'pi-users', color: 'text-slate-700' },
                    { label: 'حجزوا موعداً', value: summary.booked, icon: 'pi-calendar-check', color: 'text-sky-600' },
                    { label: 'لم يحجزوا', value: summary.not_booked, icon: 'pi-calendar-minus', color: 'text-amber-600' },
                    { label: 'أكملوا المقابلة', value: summary.completed, icon: 'pi-check-circle', color: 'text-emerald-600' },
                ]" :key="item.label" class="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <i :class="['pi', item.icon, item.color, 'text-xl']" />
                    <p class="mt-4 text-[11px] font-bold text-slate-400">{{ item.label }}</p>
                    <p :class="['mt-1 text-3xl font-black', item.color]">{{ item.value }}</p>
                </div>
            </section>

            <section class="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div class="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row">
                    <div class="relative flex-1">
                        <i class="pi pi-search absolute right-3 top-3 text-xs text-slate-400" />
                        <input v-model="search" class="w-full rounded-xl border border-slate-200 py-2.5 pr-9 pl-3 text-sm outline-none focus:border-sky-400" placeholder="ابحث باسم الطالب أو اسم المستخدم" />
                    </div>
                    <select v-model="status" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-sky-400">
                        <option value="">كل الحالات</option>
                        <option value="booked">محجوز</option>
                        <option value="not_booked">لم يحجز</option>
                        <option value="completed">مكتمل</option>
                    </select>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full min-w-[760px] text-right text-sm">
                        <thead class="bg-slate-50 text-[11px] font-black text-slate-500">
                            <tr><th class="px-5 py-3">الطالب</th><th class="px-5 py-3">الموعد</th><th class="px-5 py-3">المدرس</th><th class="px-5 py-3">الحالة</th></tr>
                        </thead>
                        <tbody v-if="!loading">
                            <tr v-for="student in students" :key="student.id" class="border-t border-slate-100">
                                <td class="px-5 py-4"><p class="font-black text-slate-800">{{ student.name || 'بدون اسم' }}</p><p class="text-xs text-slate-400">{{ student.student_code || student.username || '-' }}</p></td>
                                <td class="px-5 py-4 font-mono text-xs text-slate-600">{{ formatBooking(student.booking) || 'لم يتم الحجز' }}</td>
                                <td class="px-5 py-4 text-slate-600">{{ student.booking?.teacher_name || '-' }}</td>
                                <td class="px-5 py-4"><span :class="['rounded-full px-3 py-1 text-[11px] font-bold', statusClass(student.booking?.status)]">{{ statusLabels[student.booking?.status] || 'لم يحجز' }}</span></td>
                            </tr>
                            <tr v-if="!students.length"><td colspan="4" class="px-5 py-16 text-center text-sm font-bold text-slate-400">لا توجد نتائج مطابقة.</td></tr>
                        </tbody>
                        <tbody v-else><tr><td colspan="4" class="px-5 py-16 text-center text-slate-400"><i class="pi pi-spin pi-spinner text-xl" /></td></tr></tbody>
                    </table>
                </div>
                <div class="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-xs font-bold text-slate-500">
                    <span>صفحة {{ pageLabel }}</span>
                    <div class="flex gap-2"><button @click="page--" :disabled="page === 1" class="rounded-lg border px-3 py-1.5 disabled:opacity-40">السابق</button><button @click="page++" :disabled="page >= lastPage" class="rounded-lg border px-3 py-1.5 disabled:opacity-40">التالي</button></div>
                </div>
            </section>
        </div>
    </PartnerLayout>
</template>
