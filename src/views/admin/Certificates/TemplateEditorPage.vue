<script setup>
import { useModal } from '@/composables/useModal';
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';
import AdminLayout from '@/components/AdminLayout.vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Checkbox from 'primevue/checkbox';
import Message from 'primevue/message';

const props = defineProps({
  mode: {
    type: String,
    default: 'create'
  },
  templateId: {
    type: [String, Number],
    default: null
  }
});

const router = useRouter();
const { showAlert } = useModal();

const isLoading = ref(false);
const boardRef = ref(null);
const canvasElements = ref([]);
const selectedElementId = ref(null);
const interactionState = ref(null);
const currentTemplate = ref({
  name: '',
  content_html: '',
  elements_json: '[]',
  is_default: false,
  background_image: null
});

const canvasWidth = 1123;
const canvasHeight = 794;
const placeholderOptions = [
  { label: 'Student Name', value: 'name' },
  { label: 'Exam Name', value: 'exam' },
  { label: 'Score', value: 'score' },
  { label: 'Total Points', value: 'total_points' },
  { label: 'CEFR', value: 'cefr' },
  { label: 'ACTFL', value: 'actfl' },
  { label: 'Date', value: 'date' },
  { label: 'Certificate Number', value: 'number' },
  { label: 'Verification URL', value: 'verification_url' },
  { label: 'Skills Table', value: 'skills_table' }
];

const selectedElement = computed({
  get: () => canvasElements.value.find((item) => item.id === selectedElementId.value) || null,
  set: (value) => {
    if (!value) return;
    canvasElements.value = canvasElements.value.map((item) => (item.id === value.id ? value : item));
  }
});

const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const parseElements = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/\"/g, '&quot;');

const buildContentHtml = () => {
  if (!canvasElements.value.length) {
    return currentTemplate.value.content_html || '';
  }

  const body = canvasElements.value.map((element) => {
    if (element.type === 'skills_table') {
      return `
        <div style="position:absolute; left:${element.x}px; top:${element.y}px; width:${element.width}px; height:${element.height}px;">
          <table style="width:100%; height:100%; border-collapse:collapse;">
            <thead>
              <tr>
                <th style="border:1px solid #cbd5e1; padding:8px; text-align:left; font-size:14px;">Skill</th>
                <th style="border:1px solid #cbd5e1; padding:8px; text-align:left; font-size:14px;">Score</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="2" style="border:1px solid #cbd5e1; padding:8px; vertical-align:top;">{skills_table}</td>
              </tr>
            </tbody>
          </table>
        </div>`;
    }

    if (element.type === 'image') {
      return `
        <div style="position:absolute; left:${element.x}px; top:${element.y}px; width:${element.width}px; height:${element.height}px;">
          <img src="${element.imageUrl || ''}" alt="Certificate logo" style="width:100%; height:100%; object-fit:contain;" />
        </div>`;
    }

    const textValue = element.type === 'placeholder' ? `{${element.placeholder || 'name'}}` : (element.text || '');
    const safeText = escapeHtml(textValue);

    return `
      <div style="position:absolute; left:${element.x}px; top:${element.y}px; width:${element.width}px; height:${element.height}px; font-size:${element.fontSize || 24}px; font-weight:${element.fontWeight || 600}; color:${element.color || '#111827'}; text-align:${element.textAlign || 'left'}; line-height:1.2; white-space:pre-wrap;">${safeText}</div>`;
  }).join('');

  return `<div style="position:relative; width:${canvasWidth}px; height:${canvasHeight}px; margin:0 auto; font-family:Arial, sans-serif;">${body}</div>`;
};

const syncContentHtml = () => {
  if (!canvasElements.value.length) {
    if (!currentTemplate.value.content_html) {
      currentTemplate.value.content_html = '';
    }
    return;
  }

  currentTemplate.value.content_html = buildContentHtml();
};

const resetEditorState = (template = null) => {
  canvasElements.value = [];
  selectedElementId.value = null;
  interactionState.value = null;

  if (template) {
    currentTemplate.value = {
      ...template,
      name: template.name || '',
      content_html: template.content_html || '',
      elements_json: template.elements_json || '[]',
      is_default: !!template.is_default,
      background_image: template.background_image || null
    };
    canvasElements.value = parseElements(template.elements_json);
    if (canvasElements.value.length) {
      selectedElementId.value = canvasElements.value[0].id;
    }
    syncContentHtml();
  } else {
    currentTemplate.value = {
      name: '',
      content_html: '',
      elements_json: '[]',
      is_default: false,
      background_image: null
    };
  }
};

watch(canvasElements, syncContentHtml, { deep: true });

const fetchTemplate = async () => {
  if (props.mode !== 'edit' || !props.templateId) return;
  isLoading.value = true;
  try {
    const res = await api.get(`/admin/certificate-templates/${props.templateId}`);
    resetEditorState(res.data);
  } catch (err) {
    console.error('Failed to fetch template', err);
    showAlert('Failed to load template.');
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchTemplate);

const handleFileUpload = async (event) => {
  currentTemplate.value.background_image = event.target.files[0];
};

const handleLogoUpload = async (event) => {
  const file = event.target.files?.[0];
  if (!file || !selectedElement.value) return;

  const reader = new FileReader();
  reader.onload = () => {
    selectedElement.value.imageUrl = reader.result;
    canvasElements.value = [...canvasElements.value];
  };
  reader.readAsDataURL(file);
};

const addElement = (type) => {
  const base = {
    id: createId(),
    type,
    x: 80,
    y: 80,
    width: type === 'skills_table' ? 480 : 320,
    height: type === 'skills_table' ? 220 : 72,
    fontSize: 24,
    fontWeight: 600,
    color: '#111827',
    textAlign: 'left'
  };

  if (type === 'text') {
    base.text = 'New text';
  } else if (type === 'placeholder') {
    base.placeholder = 'name';
    base.text = 'Student Name';
  } else if (type === 'image') {
    base.width = 180;
    base.height = 180;
    base.imageUrl = '';
  } else {
    base.text = 'Skills table';
  }

  canvasElements.value.push(base);
  selectedElementId.value = base.id;
  syncContentHtml();
};

const removeSelectedElement = () => {
  if (!selectedElementId.value) return;
  canvasElements.value = canvasElements.value.filter((item) => item.id !== selectedElementId.value);
  selectedElementId.value = canvasElements.value[0]?.id || null;
  syncContentHtml();
};

const startInteraction = (event, element, mode = 'move') => {
  event.preventDefault();
  selectedElementId.value = element.id;
  interactionState.value = {
    id: element.id,
    mode,
    startX: event.clientX,
    startY: event.clientY,
    originX: element.x,
    originY: element.y,
    originWidth: element.width,
    originHeight: element.height
  };
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', stopInteraction);
};

const onPointerMove = (event) => {
  if (!interactionState.value || !boardRef.value) return;

  const rect = boardRef.value.getBoundingClientRect();
  const scaleX = canvasWidth / rect.width;
  const scaleY = canvasHeight / rect.height;
  const deltaX = (event.clientX - interactionState.value.startX) * scaleX;
  const deltaY = (event.clientY - interactionState.value.startY) * scaleY;

  const elementIndex = canvasElements.value.findIndex((item) => item.id === interactionState.value.id);
  if (elementIndex === -1) return;

  const element = canvasElements.value[elementIndex];
  if (interactionState.value.mode === 'move') {
    element.x = clamp(interactionState.value.originX + deltaX, 0, canvasWidth - element.width);
    element.y = clamp(interactionState.value.originY + deltaY, 0, canvasHeight - element.height);
  } else {
    const nextWidth = clamp(interactionState.value.originWidth + deltaX, 80, canvasWidth);
    const nextHeight = clamp(interactionState.value.originHeight + deltaY, 40, canvasHeight);
    element.width = nextWidth;
    element.height = nextHeight;
  }

  canvasElements.value = [...canvasElements.value];
};

const stopInteraction = () => {
  interactionState.value = null;
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', stopInteraction);
};

const clearCanvas = () => {
  canvasElements.value = [];
  selectedElementId.value = null;
  syncContentHtml();
};

const getElementStyle = (element) => ({
  fontSize: `${element.fontSize || 24}px`,
  fontWeight: element.fontWeight || 600,
  color: element.color || '#111827',
  textAlign: element.textAlign || 'left'
});

const getElementText = (element) => {
  if (element.type === 'placeholder') {
    return `{${element.placeholder || 'name'}}`;
  }

  return element.text || 'Edit me';
};

const saveTemplate = async () => {
  const formData = new FormData();
  formData.append('name', currentTemplate.value.name);
  formData.append('content_html', currentTemplate.value.content_html || buildContentHtml());
  formData.append('elements_json', JSON.stringify(canvasElements.value));
  formData.append('is_default', currentTemplate.value.is_default ? '1' : '0');

  if (currentTemplate.value.background_image instanceof File) {
    formData.append('background_image', currentTemplate.value.background_image);
  }

  try {
    if (props.mode === 'edit' && props.templateId) {
      formData.append('_method', 'PATCH');
      await api.post(`/admin/certificate-templates/${props.templateId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } else {
      await api.post('/admin/certificate-templates', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }

    router.push({ name: 'admin.certificates.templates' });
  } catch (err) {
    console.error('Failed to save template', err);
    showAlert('Failed to save template. Please check the form data.');
  }
};

const generatePreviewHtml = async () => {
  const content = currentTemplate.value.content_html || '<div style="text-align: center; margin-top: 100px; color: #94a3b8;">Add elements to start previewing...</div>';

  const sampleData = {
    '{name}': 'Abdulaziz Rustamov (Sample Student)',
    '{exam}': 'Arabic Language Proficiency Test (ALPT)',
    '{score}': '82.7',
    '{total_points}': '745',
    '{cefr}': 'C1.2',
    '{actfl}': 'Advanced High',
    '{date}': new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    '{number}': 'CERT-SAMPLE-001',
    '{verification_url}': '#',
    '{skills_table}': `
      <tr><td>Section: Composition</td><td>810/900</td><td>90.0%</td><td>C2</td><td>Superior</td><td>25 Aug. 2022</td></tr>
      <tr><td>Section: Speaking</td><td>680/900</td><td>75.6%</td><td>C1.1</td><td>Advanced Mid +</td><td>25 Aug. 2022</td></tr>
    `
  };

  let processedContent = content;
  Object.entries(sampleData).forEach(([key, val]) => {
    processedContent = processedContent.replace(new RegExp(key, 'g'), val);
  });

  let backgroundUrl = '';
  if (currentTemplate.value.background_image) {
    if (currentTemplate.value.background_image instanceof File) {
      backgroundUrl = URL.createObjectURL(currentTemplate.value.background_image);
    } else {
      backgroundUrl = '/storage/' + currentTemplate.value.background_image;
    }
  }

  return `
    <html>
    <head>
      <style>
        body { font-family: sans-serif; margin: 0; padding: 0; background-image: url('${backgroundUrl}'); background-size: cover; background-repeat: no-repeat; width: 100%; height: 100vh; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .container { width: 100%; padding: 40px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">${processedContent}</div>
    </body>
    </html>
  `;
};
</script>

<template>
  <AdminLayout>
    <div class="p-6 space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-black text-slate-800 uppercase tracking-tight">
            {{ props.mode === 'edit' ? 'Edit Template' : 'Create Template' }}
          </h1>
          <p class="text-slate-500 text-sm font-medium italic">Design the certificate layout visually and save it as a reusable template.</p>
        </div>
        <Button label="Back to Templates" icon="pi pi-arrow-left" class="p-button-sm p-button-outlined" @click="router.push({ name: 'admin.certificates.templates' })" />
      </div>

      <div v-if="isLoading" class="flex justify-center py-20">
        <i class="pi pi-spin pi-spinner text-4xl text-slate-200"></i>
      </div>

      <div v-else class="grid grid-cols-1 xl:grid-cols-[320px,1fr] gap-8">
        <div class="space-y-6">
          <div class="flex flex-col gap-2">
            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Template Name</label>
            <InputText v-model="currentTemplate.name" placeholder="e.g. Executive Achievement Certificate" class="w-full" />
          </div>

          <div class="flex flex-col gap-2">
            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Background Image (Optional)</label>
            <input type="file" @change="handleFileUpload" class="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
            <p class="text-[9px] text-slate-400 italic">Recommended: 1123x794 (A4 Landscape)</p>
          </div>

          <div class="flex items-center gap-2 mt-4">
            <Checkbox v-model="currentTemplate.is_default" :binary="true" inputId="is_default" />
            <label for="is_default" class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Set as default for new issuances</label>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Add elements</h4>
              <Button label="Clear" icon="pi pi-trash" class="p-button-text p-button-sm" @click="clearCanvas" />
            </div>
            <div class="grid grid-cols-1 gap-2">
              <Button label="Text" icon="pi pi-plus" class="p-button-sm p-button-outlined" @click="addElement('text')" />
              <Button label="Placeholder" icon="pi pi-tag" class="p-button-sm p-button-outlined" @click="addElement('placeholder')" />
              <Button label="Logo" icon="pi pi-image" class="p-button-sm p-button-outlined" @click="addElement('image')" />
              <Button label="Skills Table" icon="pi pi-table" class="p-button-sm p-button-outlined" @click="addElement('skills_table')" />
            </div>
          </div>

          <div v-if="selectedElement" class="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Element settings</h4>
              <Button icon="pi pi-trash" class="p-button-text p-button-sm" @click="removeSelectedElement" />
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</label>
              <select v-model="selectedElement.type" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                <option value="text">Text</option>
                <option value="placeholder">Placeholder</option>
                <option value="skills_table">Skills Table</option>
              </select>
            </div>

            <div v-if="selectedElement.type === 'text'" class="flex flex-col gap-2">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Text</label>
              <InputText v-model="selectedElement.text" class="w-full" />
            </div>

            <div v-else-if="selectedElement.type === 'placeholder'" class="flex flex-col gap-2">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Placeholder</label>
              <select v-model="selectedElement.placeholder" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                <option v-for="option in placeholderOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
            </div>

            <div v-else-if="selectedElement.type === 'image'" class="flex flex-col gap-2">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logo Image</label>
              <input type="file" accept="image/*" @change="handleLogoUpload" class="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
              <p class="text-[9px] text-slate-400 italic">PNG or JPG works well for the certificate logo.</p>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="flex flex-col gap-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Font size</label>
                <InputText v-model.number="selectedElement.fontSize" type="number" class="w-full" />
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Color</label>
                <input v-model="selectedElement.color" type="color" class="h-10 w-full rounded-xl border border-slate-200 bg-white p-1" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="flex flex-col gap-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Width</label>
                <InputText v-model.number="selectedElement.width" type="number" class="w-full" />
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Height</label>
                <InputText v-model.number="selectedElement.height" type="number" class="w-full" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="flex flex-col gap-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">X</label>
                <InputText v-model.number="selectedElement.x" type="number" class="w-full" />
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Y</label>
                <InputText v-model.number="selectedElement.y" type="number" class="w-full" />
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alignment</label>
              <select v-model="selectedElement.textAlign" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>

          <div v-else class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-[11px] font-semibold text-slate-500">
            Select an element to change its settings.
          </div>

          <Message severity="info" class="rounded-2xl" :closable="false">
            <p class="text-[9px] font-bold leading-relaxed italic">The visual canvas generates the same HTML that the server uses for PDF rendering.</p>
          </Message>
        </div>

        <div class="space-y-4">
          <div class="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div class="flex items-center justify-between mb-3">
              <div>
                <h3 class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Visual Canvas</h3>
                <p class="text-[9px] text-slate-400 italic">Drag elements and resize them with the small handle.</p>
              </div>
              <div class="text-[8px] font-black uppercase tracking-[0.2em] text-brand-primary">A4 Landscape</div>
            </div>
            <div ref="boardRef" class="relative w-full rounded-[1.5rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_#f8fafc,_#f1f5f9)] overflow-hidden" style="aspect-ratio: 1123 / 794;">
              <div v-if="!canvasElements.length" class="absolute inset-0 flex items-center justify-center text-center px-8 text-sm text-slate-400">Start by adding a text block, a placeholder, or a skills table.</div>
              <div v-for="element in canvasElements" :key="element.id" class="absolute cursor-move select-none" :class="selectedElementId === element.id ? 'ring-2 ring-brand-primary ring-offset-2 ring-offset-white' : ''" :style="{ left: `${element.x}px`, top: `${element.y}px`, width: `${element.width}px`, height: `${element.height}px` }" @pointerdown="startInteraction($event, element, 'move')">
                <div class="w-full h-full rounded-2xl border border-dashed border-slate-300 bg-white/90 p-3 overflow-hidden shadow-sm" :style="{ backgroundColor: element.type === 'skills_table' ? '#f8fafc' : 'white' }">
                  <div v-if="element.type === 'skills_table'" class="w-full h-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-600">
                    <div class="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      <span>Skills Table</span>
                      <span>Drag me</span>
                    </div>
                    <table class="w-full border-collapse text-[10px]">
                      <thead>
                        <tr>
                          <th class="border border-slate-200 p-1 text-left">Skill</th>
                          <th class="border border-slate-200 p-1 text-left">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td class="border border-slate-200 p-1">{skills_table}</td>
                          <td class="border border-slate-200 p-1">—</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div v-else-if="element.type === 'image'" class="w-full h-full overflow-hidden rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center">
                    <img v-if="element.imageUrl" :src="element.imageUrl" class="w-full h-full object-contain" />
                    <div v-else class="text-[10px] font-black uppercase tracking-widest text-slate-400">Upload Logo</div>
                  </div>
                  <div v-else class="w-full h-full overflow-hidden" :style="getElementStyle(element)">
                    {{ getElementText(element) }}
                  </div>
                </div>
                <div v-if="selectedElementId === element.id" class="absolute -right-2 -bottom-2 h-4 w-4 rounded-full border-2 border-white bg-brand-primary cursor-se-resize" @pointerdown.stop="startInteraction($event, element, 'resize')"></div>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Generated HTML Output</label>
            <Textarea :model-value="currentTemplate.content_html" class="font-mono text-xs p-4 bg-slate-900 text-emerald-400 rounded-2xl border-none shadow-inner resize-none min-h-[220px]" readonly />
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3">
        <Button label="Cancel" class="p-button-text p-button-sm font-black uppercase tracking-widest text-slate-400" @click="router.push({ name: 'admin.certificates.templates' })" />
        <Button label="Save Template" icon="pi pi-check" class="p-button-raised p-button-sm font-black uppercase tracking-widest" @click="saveTemplate" />
      </div>
    </div>
  </AdminLayout>
</template>
