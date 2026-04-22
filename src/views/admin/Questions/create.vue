<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

import Button from 'primevue/button';
import Card from 'primevue/card';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Message from 'primevue/message';
import InputNumber from 'primevue/inputnumber';
import Slider from 'primevue/slider';

const router = useRouter();
const route = useRoute();

const skills = ref([]);
const exams = ref([]);
const passages = ref([]);
const isSubmitting = ref(false);
const errorMsg = ref('');

const questionTypes = [
    { label: 'Multiple Choice (MCQ)', value: 'mcq', icon: 'pi-check-square' },
    { label: 'True / False', value: 'true_false', icon: 'pi-verified' },
    { label: 'Short Answer', value: 'short_answer', icon: 'pi-pencil' },
    { label: 'Writing Task', value: 'writing', icon: 'pi-file-edit' },
    { label: 'Speaking Task', value: 'speaking', icon: 'pi-microphone' },
    { label: 'File Upload', value: 'upload', icon: 'pi-upload' }
];

const form = ref({
    skill_id: '',
    exam_id: '',
    level_id: 5,
    passage_mode: 'none', 
    passage_id: '',
    passage_type: 'text',
    passage_title: '',
    passage_content: '',
    passage_questions_limit: null,
    passage_is_random: false,
    p_media: null,
    questions: []
});

const pFileInput = ref(null);
const pMediaPreview = ref(null);

const createEmptyQuestion = () => ({
    type: 'mcq',
    content_mode: 'text',  // 'text' | 'media'
    content: '',
    instructions: '',
    points: 1,
    min_words: null,
    max_words: null,
    q_media: null,
    q_media_preview: null,
    options: [
        { option_text: '', is_correct: true },
        { option_text: '', is_correct: false }
    ]
});

const addQuestion = () => {
    form.value.questions.push(createEmptyQuestion());
};

const removeQuestion = (index) => {
    if (form.value.questions.length > 1) {
        form.value.questions.splice(index, 1);
    }
};

const loadInitialData = async () => {
    try {
        const [resSkills, resExams, resPassages] = await Promise.all([
            api.get('/admin/skills'),
            api.get('/admin/exams'),
            api.get('/admin/passages').catch(() => ({ data: [] }))
        ]);
        skills.value = resSkills.data;
        exams.value = resExams.data;
        passages.value = resPassages.data;

        if (route.query.skill_id) form.value.skill_id = Number(route.query.skill_id);
        if (route.query.exam_id) form.value.exam_id = Number(route.query.exam_id);

        addQuestion();
    } catch (err) {
        console.error('Failed to load initial data', err);
    }
};

const handlePFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    form.value.p_media = file;
    pMediaPreview.value = { url: URL.createObjectURL(file), type: file.type };
};

const handleQFileChange = (e, index) => {
    const file = e.target.files[0];
    if (!file) return;
    form.value.questions[index].q_media = file;
    form.value.questions[index].q_media_preview = { url: URL.createObjectURL(file), type: file.type };
};

const addOption = (qIdx) => {
    form.value.questions[qIdx].options.push({ option_text: '', is_correct: false });
};
const removeOption = (qIdx, optIdx) => {
    if (form.value.questions[qIdx].options.length > 1) {
        form.value.questions[qIdx].options.splice(optIdx, 1);
    }
};
const setCorrect = (qIdx, optIdx) => {
    form.value.questions[qIdx].options.forEach((opt, i) => {
        opt.is_correct = (i === optIdx);
    });
};

const handleTypeChange = (qIdx) => {
    const q = form.value.questions[qIdx];
    if (q.type === 'true_false') {
        q.options = [
            { option_text: 'True', is_correct: true },
            { option_text: 'False', is_correct: false }
        ];
    } else if (['writing', 'speaking', 'upload'].includes(q.type)) {
        q.options = [];
    } else if (q.type === 'short_answer') {
        q.options = [{ option_text: '', is_correct: true }];
    } else {
        if (q.options.length < 2) {
            q.options = [
                { option_text: '', is_correct: true },
                { option_text: '', is_correct: false }
            ];
        }
    }
};

const saveBatch = async () => {
    if (!form.value.exam_id) {
        errorMsg.value = 'Please select an Exam first.';
        return;
    }

    isSubmitting.value = true;
    errorMsg.value = '';

    try {
        const fd = new FormData();
        fd.append('skill_id', form.value.skill_id);
        fd.append('exam_id', form.value.exam_id);
        fd.append('level_id', form.value.level_id);
        fd.append('passage_mode', form.value.passage_mode);

        if (form.value.passage_mode === 'existing') {
            fd.append('passage_id', form.value.passage_id);
        } else if (form.value.passage_mode === 'new') {
            fd.append('passage_type', form.value.passage_type);
            fd.append('passage_title', form.value.passage_title || '');
            fd.append('passage_content', form.value.passage_content || '');
            if (form.value.passage_questions_limit) fd.append('passage_questions_limit', form.value.passage_questions_limit);
            fd.append('passage_is_random', form.value.passage_is_random ? 1 : 0);
            if (form.value.p_media) fd.append('p_media_file', form.value.p_media);
        }

        form.value.questions.forEach((q, qIdx) => {
            fd.append(`questions[${qIdx}][type]`, q.type);
            fd.append(`questions[${qIdx}][content]`, q.content || '');
            fd.append(`questions[${qIdx}][instructions]`, q.instructions || '');
            fd.append(`questions[${qIdx}][points]`, q.points);
            if (q.min_words) fd.append(`questions[${qIdx}][min_words]`, q.min_words);
            if (q.max_words) fd.append(`questions[${qIdx}][max_words]`, q.max_words);
            if (q.q_media) fd.append(`questions[${qIdx}][q_media_file]`, q.q_media);

            q.options.forEach((opt, oIdx) => {
                fd.append(`questions[${qIdx}][options][${oIdx}][option_text]`, opt.option_text);
                fd.append(`questions[${qIdx}][options][${oIdx}][is_correct]`, opt.is_correct ? 1 : 0);
            });
        });

        await api.post('/admin/questions', fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        router.push('/admin/questions');
    } catch (err) {
        errorMsg.value = err.response?.data?.message || 'Failed to save questions.';
    } finally {
        isSubmitting.value = false;
    }
};

onMounted(() => {
    loadInitialData();
});
</script>

<template>
    <AdminLayout>
        <div class="space-y-8 pb-32 mt-6 px-4 md:px-12 animate-in fade-in duration-500">
            <!-- Header -->
            <div class="flex items-center justify-between bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <div class="flex items-center gap-6">
                    <Button icon="pi pi-arrow-left" severity="secondary" outlined rounded @click="router.push('/admin/questions')" />
                    <div>
                        <h1 class="text-2xl font-black text-slate-800 tracking-tight">Create New Questions</h1>
                        <p class="text-xs font-bold text-indigo-500 uppercase tracking-widest mt-1">Add content and link properties</p>
                    </div>
                </div>
                <!-- Primary Action -->
                <Button label="Save All Changes" icon="pi pi-check-circle" :loading="isSubmitting" @click="saveBatch" 
                    class="rounded-2xl px-10 py-3 font-black shadow-lg" severity="success" />
            </div>

            <Message v-if="errorMsg" severity="error" :closable="false" class="rounded-2xl">{{ errorMsg }}</Message>

            <!-- 1. Metadata -->
            <Card class="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-slate-50/50">
                <template #title>
                    <div class="flex items-center px-4 py-2 gap-4">
                        <div class="w-10 h-10 bg-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-lg">
                            <i class="pi pi-cog text-xl"></i>
                        </div>
                        <span class="text-lg font-black text-slate-800">Exam & Skill Settings</span>
                    </div>
                </template>
                <template #content>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
                        <div class="flex flex-col">
                            <label class="text-xs font-black text-slate-500 mb-3 ml-2 uppercase tracking-wider">Target Skill</label>
                            <Select v-model="form.skill_id" :options="skills" optionLabel="name" optionValue="id"
                                placeholder="Select Skill" class="w-full rounded-2xl border-none shadow-sm h-14 flex items-center px-4 bg-white" />
                        </div>
                        <div class="flex flex-col">
                            <label class="text-xs font-black text-slate-500 mb-3 ml-2 uppercase tracking-wider">Linked Exam (Required)</label>
                            <Select v-model="form.exam_id" :options="exams" optionLabel="title" optionValue="id"
                                placeholder="Select Exam" class="w-full rounded-2xl border-none shadow-sm h-14 flex items-center px-4 bg-white" />
                        </div>
                        <div class="flex flex-col">
                            <label class="text-xs font-black text-slate-500 mb-3 ml-2 uppercase tracking-wider">Difficulty Level ({{ form.level_id }})</label>
                            <Slider v-model="form.level_id" :min="1" :max="9" :step="1" class="w-full mt-4" />
                            <div class="flex justify-between text-[10px] text-slate-400 font-black mt-4 uppercase tracking-tighter">
                                <span>Beginner</span>
                                <span>Expert</span>
                            </div>
                        </div>
                    </div>
                </template>
            </Card>

            <!-- 2. Passage Context -->
            <Card class="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-slate-50/50">
                <template #title>
                    <div class="flex items-center px-4 py-2 gap-4">
                        <div class="w-10 h-10 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg">
                            <i class="pi pi-book text-xl"></i>
                        </div>
                        <span class="text-lg font-black text-slate-800">Passage Context</span>
                    </div>
                </template>
                <template #content>
                    <div class="px-4 space-y-8">
                        <div class="flex flex-wrap gap-4">
                            <label v-for="mode in [{id:'none', label:'No Passage', icon:'pi-ban'}, {id:'existing', label:'Existing Passage', icon:'pi-search'}, {id:'new', label:'Create New Passage', icon:'pi-plus-circle'}]" 
                                :key="mode.id"
                                class="flex-1 flex items-center justify-center gap-4 cursor-pointer p-5 rounded-[1.5rem] border-2 transition-all select-none"
                                :class="form.passage_mode === mode.id ? 'border-emerald-500 bg-white shadow-md ring-4 ring-emerald-500/10' : 'border-transparent bg-white hover:border-slate-200'">
                                <input type="radio" v-model="form.passage_mode" :value="mode.id" class="hidden" />
                                <i :class="[mode.icon, 'text-xl', form.passage_mode === mode.id ? 'text-emerald-600' : 'text-slate-300']"></i>
                                <span class="font-black" :class="form.passage_mode === mode.id ? 'text-emerald-700' : 'text-slate-600'">{{ mode.label }}</span>
                            </label>
                        </div>

                        <div v-if="form.passage_mode === 'existing'" class="animate-in fade-in slide-in-from-top-2 duration-400">
                            <label class="text-xs font-black text-slate-500 mb-3 block mr-2">Search in Passage Library</label>
                            <Select v-model="form.passage_id" :options="passages" optionLabel="title" optionValue="id"
                                placeholder="Start typing passage title..." class="w-full md:w-1/2 rounded-2xl border-none shadow-sm" filter />
                        </div>

                        <div v-if="form.passage_mode === 'new'" class="bg-white p-8 rounded-[2rem] shadow-sm space-y-8 animate-in zoom-in-95 duration-400">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div class="flex flex-col">
                                    <label class="text-xs font-black text-slate-500 mb-3">Passage Content Type</label>
                                    <Select v-model="form.passage_type" 
                                        :options="[{label: 'Dynamic Text', value: 'text'}, {label: 'Image / Diagram', value: 'image'}, {label: 'Audio Clip', value: 'audio'}, {label: 'Video Clip', value: 'video'}]"
                                        optionLabel="label" optionValue="value" class="w-full rounded-2xl" />
                                </div>
                                <div class="flex flex-col">
                                    <label class="text-xs font-black text-slate-500 mb-3">Internal Title (Admin Only)</label>
                                    <InputText v-model="form.passage_title" placeholder="Unique name for this context..." class="w-full rounded-2xl font-bold" />
                                </div>
                            </div>

                            <div v-if="form.passage_type === 'text'" class="flex flex-col">
                                <label class="text-xs font-black text-slate-500 mb-3">Text Content</label>
                                <Textarea v-model="form.passage_content" rows="6" placeholder="Paste or write the text content here..." class="w-full rounded-[1.5rem] p-6 font-medium leading-relaxed" autoResize />
                            </div>
                            
                            <div v-else class="flex flex-col">
                                <label class="text-xs font-black text-slate-500 mb-4">Upload {{form.passage_type}} File</label>
                                <div class="flex gap-6 items-start">
                                    <div @click="pFileInput.click()" class="w-40 h-40 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all group">
                                        <input type="file" ref="pFileInput" class="hidden" @change="handlePFileChange" accept="image/*,audio/*,video/*" />
                                        <i class="pi pi-cloud-upload text-3xl text-slate-300 group-hover:text-emerald-500 mb-2"></i>
                                        <span class="text-[10px] font-black text-slate-400 group-hover:text-emerald-600 uppercase tracking-widest">Select File</span>
                                    </div>
                                    <div v-if="pMediaPreview" class="flex-grow bg-slate-50 p-4 rounded-[2rem] flex items-center justify-center min-h-[10rem]">
                                        <img v-if="pMediaPreview.type.startsWith('image/')" :src="pMediaPreview.url" class="rounded-2xl max-h-32 shadow-sm" />
                                        <audio v-if="pMediaPreview.type.startsWith('audio/')" :src="pMediaPreview.url" controls class="w-full"></audio>
                                        <video v-if="pMediaPreview.type.startsWith('video/')" :src="pMediaPreview.url" controls class="rounded-2xl max-h-32 mb-0"></video>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
            </Card>

            <!-- 3. Question List -->
            <div class="space-y-6">
                <div class="flex items-center justify-between bg-white px-8 py-5 rounded-[2rem] shadow-sm border border-slate-50">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg">
                            <i class="pi pi-list text-xl"></i>
                        </div>
                        <span class="text-lg font-black text-slate-800">Draft Questions</span>
                    </div>
                    <Button label="Add Another Question" icon="pi pi-plus" severity="success" rounded @click="addQuestion" class="font-black text-xs px-6 py-3" />
                </div>

                <div v-for="(q, qIdx) in form.questions" :key="qIdx" 
                    class="group relative bg-white border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 rounded-[2.5rem] p-8 md:p-12 animate-in slide-in-from-bottom-4">
                    
                    <div class="absolute -left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white border-2 border-slate-50 text-slate-800 rounded-2xl flex items-center justify-center font-black shadow-xl group-hover:bg-emerald-500 group-hover:text-white transition-all z-10">
                        {{ qIdx + 1 }}
                    </div>

                    <button v-if="form.questions.length > 1" @click="removeQuestion(qIdx)" 
                        class="absolute -right-3 -top-3 w-10 h-10 bg-white border border-slate-100 text-rose-500 rounded-full shadow-lg opacity-0 group-hover:opacity-100 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center z-10">
                        <i class="pi pi-times text-xs"></i>
                    </button>

                    <div class="space-y-10">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div class="flex flex-col">
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Question Type</label>
                                <Select v-model="q.type" @change="handleTypeChange(qIdx)"
                                    :options="questionTypes" optionLabel="label" optionValue="value" class="w-full rounded-2xl bg-slate-50/50 border-none px-4 h-14 flex items-center" />
                            </div>
                            <div class="flex flex-col">
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Instructions</label>
                                <InputText v-model="q.instructions" placeholder="e.g. Choose the correct answer based on the text, audio or image attached" class="w-full rounded-2xl bg-slate-50/50 border-none px-6 h-14 font-bold" />
                            </div>
                        </div>

                        <!-- Question Content: Text OR Media Toggle -->
                        <div class="space-y-4">
                            <!-- Mode Selector -->
                            <div class="flex items-center gap-3">
                                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Question Content</span>
                                <div class="flex bg-slate-100 rounded-2xl p-1 gap-1">
                                    <button type="button" @click="q.content_mode = 'text'; q.q_media = null; q.q_media_preview = null"
                                        :class="q.content_mode === 'text' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'"
                                        class="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all flex items-center gap-2">
                                        <i class="pi pi-align-left text-xs"></i> Text
                                    </button>
                                    <button type="button" @click="q.content_mode = 'media'; q.content = ''"
                                        :class="q.content_mode === 'media' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'"
                                        class="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all flex items-center gap-2">
                                        <i class="pi pi-image text-xs"></i> Audio / Image / Video
                                    </button>
                                </div>
                            </div>

                            <!-- Text Mode -->
                            <Textarea v-if="q.content_mode === 'text'"
                                v-model="q.content" rows="2"
                                placeholder="Type your question here..."
                                class="w-full rounded-[1.5rem] bg-slate-50/50 border-none p-6 font-bold text-lg" autoResize />

                            <!-- Media Mode -->
                            <div v-else class="animate-in zoom-in-95 duration-300">
                                <div class="flex gap-6 items-start">
                                    <div @click="$refs[`qFile_${qIdx}`][0].click()"
                                        class="w-44 h-44 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all group"
                                        :class="q.q_media_preview ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50'">
                                        <input type="file" :ref="`qFile_${qIdx}`" class="hidden"
                                            @change="(e) => handleQFileChange(e, qIdx)"
                                            accept="image/*,audio/*,video/*" />
                                        <i v-if="!q.q_media_preview" class="pi pi-cloud-upload text-3xl text-slate-300 group-hover:text-indigo-400 mb-2"></i>
                                        <i v-else class="pi pi-check-circle text-3xl text-emerald-500 mb-2"></i>
                                        <span class="text-[10px] font-black uppercase tracking-widest"
                                            :class="q.q_media_preview ? 'text-emerald-600' : 'text-slate-400 group-hover:text-indigo-500'">
                                            {{ q.q_media_preview ? 'File Selected' : 'Upload File' }}
                                        </span>
                                    </div>
                                    <div v-if="q.q_media_preview" class="flex-grow bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-[11rem] gap-3">
                                        <img v-if="q.q_media_preview.type.startsWith('image/')" :src="q.q_media_preview.url" class="max-h-36 rounded-2xl shadow-sm object-contain" />
                                        <audio v-else-if="q.q_media_preview.type.startsWith('audio/')" :src="q.q_media_preview.url" controls class="w-full"></audio>
                                        <video v-else-if="q.q_media_preview.type.startsWith('video/')" :src="q.q_media_preview.url" controls class="max-h-36 rounded-2xl shadow-sm"></video>
                                        <button type="button" @click="q.q_media = null; q.q_media_preview = null" class="text-[9px] font-black text-rose-400 hover:text-rose-600 uppercase tracking-wide">
                                            <i class="pi pi-times mr-1"></i>Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            <!-- Options Section -->
                            <div v-if="!['writing', 'speaking', 'upload'].includes(q.type)" class="space-y-6">
                                <div class="flex items-center justify-between">
                                    <label class="text-xs font-black text-indigo-500 ml-2 uppercase tracking-wide">Options</label>
                                    <Button v-if="['mcq', 'short_answer'].includes(q.type)" icon="pi pi-plus" label="Add Option" text rounded @click="addOption(qIdx)" class="text-[10px] font-black text-emerald-600" />
                                </div>
                                <div class="space-y-3">
                                    <div v-for="(opt, oIdx) in q.options" :key="oIdx" 
                                        class="flex items-center gap-4 p-3 rounded-2xl border-2 transition-all bg-white"
                                        :class="opt.is_correct ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-50'">
                                        <button v-if="q.type !== 'short_answer'" type="button" @click="setCorrect(qIdx, oIdx)" 
                                            class="w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all shrink-0"
                                            :class="opt.is_correct ? 'bg-emerald-500 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-200 text-transparent'">
                                            <i class="pi pi-check text-[10px] font-black"></i>
                                        </button>
                                        <InputText v-model="opt.option_text" :disabled="q.type === 'true_false'" :placeholder="q.type === 'short_answer' ? 'Accepted variation...' : 'Option value...'" class="w-full border-none bg-transparent font-bold text-slate-800 focus:ring-0" />
                                        <button v-if="['mcq', 'short_answer'].includes(q.type) && q.options.length > 1" @click="removeOption(qIdx, oIdx)" class="text-slate-300 hover:text-rose-500 p-2">
                                            <i class="pi pi-trash text-xs"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Points & Word Limits -->
                            <div class="flex flex-col space-y-6 bg-slate-50/50 p-6 rounded-[2rem]">
                                <label class="text-xs font-black text-slate-500 ml-2 uppercase tracking-wide">Scoring</label>
                                <div class="grid grid-cols-2 gap-6 items-end">
                                    <div class="flex flex-col">
                                        <label class="text-[9px] font-black text-slate-400 mb-2 ml-1">Points</label>
                                        <InputNumber v-model="q.points" :min="1" class="w-full" showButtons />
                                    </div>
                                    <div v-if="q.type === 'writing'" class="flex gap-2">
                                         <div class="grow">
                                            <label class="text-[9px] font-black text-slate-400 mb-2">Min Words</label>
                                            <InputNumber v-model="q.min_words" placeholder="0" class="w-full" />
                                        </div>
                                         <div class="grow">
                                            <label class="text-[9px] font-black text-slate-400 mb-2">Max Words</label>
                                            <InputNumber v-model="q.max_words" placeholder="200" class="w-full" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer Action -->
            <div class="flex justify-center pt-10 border-t border-slate-100">
                <Button type="button" :loading="isSubmitting" label="Publish Questions" icon="pi pi-cloud-upload" size="large" @click="saveBatch" 
                    class="rounded-[2rem] px-24 py-6 font-black text-xl bg-slate-900 border-none hover:bg-emerald-600 shadow-2xl transition-all hover:scale-105 active:scale-95" />
            </div>
        </div>
    </AdminLayout>
</template>

<style scoped>
:deep(.p-select) {
    border: none;
    background: white;
}
:deep(.p-inputnumber-input) {
    font-weight: 900;
    text-align: center;
    border-radius: 1rem;
}
</style>
