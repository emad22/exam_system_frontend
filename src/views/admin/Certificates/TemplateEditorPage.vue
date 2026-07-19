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

// Use an editable ref for the selected element to avoid mutating reactive arrays directly
const selectedElementRef = ref(null);

const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const parseElements = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
};

// Ensure parsed elements all have an `id` so the editor can track and select them.
const ensureElementIds = (items) => {
  return (items || []).map((it) => {
    const el = { ...it };
    if (!el.id) el.id = createId();
    // defaults for visual editor to avoid invalid bindings
    el.x = Number(el.x) || 0;
    el.y = Number(el.y) || 0;
    // normalize legacy keys
    if (el.src && !el.imageUrl) el.imageUrl = el.src;
    if (el.align && !el.textAlign) el.textAlign = el.align;
    if (el.weight && !el.fontWeight) el.fontWeight = Number(el.weight);
    if (el.style && !el.fontStyle) el.fontStyle = el.style;
    if (el.name && !el.text && el.type !== 'image') el.text = el.name;
    if (el.name && el.type === 'sign' && !el.namePlaceholder) el.namePlaceholder = el.name;

    el.width = Number(el.width) || (el.type === 'skills_table' ? 940 : (el.type === 'image' ? 150 : 320));
    // clamp width/height so elements don't overflow the canvas
    el.width = clamp(el.width, 10, Math.max(10, canvasWidth - el.x));
    el.height = Number(el.height) || (el.type === 'skills_table' ? 220 : (el.type === 'image' ? 140 : 72));
    el.height = clamp(el.height, 10, Math.max(10, canvasHeight - el.y));
    el.fontSize = Number(el.fontSize || el.fontsize || el.font_size) || 24;
    el.fontWeight = Number(el.fontWeight) || 600;
    el.textAlign = el.textAlign || 'left';
    // validate color format, fallback to default if invalid/empty
    const hex = String(el.color || '').trim();
    el.color = /^#([0-9A-Fa-f]{6})$/.test(hex) ? hex : '#111827';
    // ensure imageUrl exists for image elements
    if (el.type === 'image' && !el.imageUrl) el.imageUrl = '';
    // normalize placeholder naming
    if (el.type === 'placeholder' && !el.placeholder && el.key) el.placeholder = el.key.replace(/^{|}$/g, '');
    // ensure keys exist
    if (!el.key && el.placeholder) el.key = el.placeholder;
    return el;
  });
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
    // normalize types for rendering
    const type = element.type || (element.key && element.key.toLowerCase().includes('photo') ? 'image' : 'text');
    if (element.type === 'skills_table') {
    return `
      <div style="position:absolute; left:${element.x}px; top:${element.y}px; width:${element.width}px; height:${element.height}px;">
        <table style="width:100%; border-collapse:collapse; font-size:12px;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="border:1px solid #cbd5e1; padding:6px;">TEST</th>
              <th style="border:1px solid #cbd5e1; padding:6px;">SCORE</th>
              <th style="border:1px solid #cbd5e1; padding:6px;">SCORE%</th>
              <th style="border:1px solid #cbd5e1; padding:6px;">LEVEL (CEFR)</th>
              <th style="border:1px solid #cbd5e1; padding:6px;">LEVEL (ACTFL)</th>
              <th style="border:1px solid #cbd5e1; padding:6px;">DATE</th>
            </tr>
          </thead>
          <tbody>{skills_table}</tbody>
        </table>
      </div>`;
  }
    // handle image/box/photo
    if (type === 'image' || element.type === 'box') {
      // if imageUrl/src present render img, otherwise render a placeholder box with text
      const imgSrc = element.imageUrl || element.src || '';
      if (imgSrc) {
        return `
          <div style="position:absolute; left:${element.x}px; top:${element.y}px; width:${element.width}px; height:${element.height}px;">
            <img src="${imgSrc}" alt="Certificate image" style="width:100%; height:100%; object-fit:contain;" />
          </div>`;
      }

      // placeholder box
      const boxText = escapeHtml(element.text || element.key || 'PHOTO');
      return `
        <div style="position:absolute; left:${element.x}px; top:${element.y}px; width:${element.width}px; height:${element.height}px; border:1px solid #cbd5e1; display:flex; align-items:center; justify-content:center; background:#f8fafc; color:#94a3b8; font-weight:bold;">
          ${boxText}
        </div>`;
    }

    // handle signature blocks
    if (element.type === 'sign' || type === 'sign') {
      const signerName = element.name || element.namePlaceholder || element.text || '';
      const signerTitle = element.title || element.signatureTitle || element.title || element.textLines && element.textLines[0] || '';
      const linesHtml = (element.textLines || []).map(l => `<div style="font-size:8px;color:#64748b;">${escapeHtml(l)}</div>`).join('');
      return `
        <div style="position:absolute; left:${element.x}px; top:${element.y}px; width:${element.width}px; height:${element.height || 80}px; text-align:center;">
          <div style="font-size:${element.fontSize || 20}px; color:${element.color || '#2563eb'}; margin:0 0 -5px 0; font-family: 'Dancing Script', cursive;">${escapeHtml(signerName)}</div>
          <div style="font-weight:900;font-size:12px;margin:0;border-top:1px solid #cbd5e1;padding-top:4px;">${escapeHtml(signerTitle)}</div>
          ${linesHtml}
        </div>`;
    }

    // handle QR
    if (element.type === 'qr' || type === 'qr') {
      return `
        <div style="position:absolute; left:${element.x}px; top:${element.y}px; width:${element.width}px; height:${element.height}px;">
          ${element.placeholder || '{qr_code}'}
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
    const leftVal = (element.textAlign === 'center' && Number(element.x) === 0) ? 0 : element.x;
    const widthVal = (element.textAlign === 'center' && Number(element.x) === 0) ? canvasWidth : element.width;

    return `
      <div style="position:absolute; left:${leftVal}px; top:${element.y}px; width:${widthVal}px; height:${element.height}px; font-size:${element.fontSize || 24}px; font-weight:${element.fontWeight || 600}; color:${element.color || '#111827'}; text-align:${element.textAlign || 'left'}; line-height:1.2; white-space:pre-wrap;">${safeText}</div>`;
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
      elements_json: template.elements_json ?? [],
      is_default: !!template.is_default,
      background_image: template.background_image || null
    };
    canvasElements.value = ensureElementIds(parseElements(template.elements_json));
    if (canvasElements.value.length) {
      selectedElementId.value = canvasElements.value[0].id;
      // set the edit buffer to a clone of the first element
      selectedElementRef.value = JSON.parse(JSON.stringify(canvasElements.value[0]));
    }
    syncContentHtml();
  } else {
    currentTemplate.value = {
      name: '',
      content_html: '',
      elements_json: [],
      is_default: false,
      background_image: null
    };
  }
};

watch(canvasElements, syncContentHtml, { deep: true });

// Sync changes from the edit buffer into the canvasElements array
let _syncingSelected = false;
watch(selectedElementRef, (val) => {
  if (!val || _syncingSelected) return;
  const idx = canvasElements.value.findIndex((it) => it.id === val.id);
  if (idx === -1) return;
  _syncingSelected = true;
  canvasElements.value.splice(idx, 1, { ...val });
  canvasElements.value = [...canvasElements.value];
  _syncingSelected = false;
}, { deep: true });

const fetchTemplate = async () => {
  if (props.mode !== 'edit' || !props.templateId) return;
  isLoading.value = true;
  try {
    // console.log('[TemplateEditor] fetching template', props.templateId, api.defaults.baseURL + `/admin/certificate-templates/${props.templateId}`);
    const res = await api.get(`/admin/certificate-templates/${props.templateId}`);
    // console.log('[TemplateEditor] template response', res.data);
    resetEditorState(res.data);
  } catch (err) {
    console.error('Failed to fetch template', err);
    // if (err.response) console.error('[TemplateEditor] response data', err.response.status, err.response.data);
    showAlert('Failed to load template.');
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchTemplate);
watch(() => props.templateId, (id) => {
  if (props.mode === 'edit' && id) {
    fetchTemplate();
  }
});

const handleFileUpload = async (event) => {
  currentTemplate.value.background_image = event.target.files[0];
};

const handleLogoUpload = async (event) => {
  const file = event.target.files?.[0];
  if (!file || !selectedElementRef.value) return;

  const reader = new FileReader();
  reader.onload = () => {
    // update the edit buffer and sync into canvasElements
    selectedElementRef.value.imageUrl = reader.result;
    const idx = canvasElements.value.findIndex((it) => it.id === selectedElementRef.value.id);
    if (idx !== -1) {
      canvasElements.value.splice(idx, 1, { ...selectedElementRef.value });
      canvasElements.value = [...canvasElements.value];
    }
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
  selectedElementRef.value = JSON.parse(JSON.stringify(base));
  syncContentHtml();
};

const importPlaceholdersFromHtml = () => {
  const html = currentTemplate.value.content_html || buildContentHtml();
  const re = /\{([a-zA-Z0-9_]+)\}/g;
  const keys = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    keys.add(m[1]);
  }

  if (!keys.size) {
    showAlert('No placeholders found in template HTML.');
    return;
  }

  // place new placeholders toward the bottom by default to avoid overlap
  let baseY = canvasHeight - 180;
  const stepX = 120;
  let offsetX = 40;

  keys.forEach((k) => {
    // skip if already present
    const exists = canvasElements.value.some(el => el.type === 'placeholder' && (el.placeholder === k || (`{${el.placeholder}}` === `{${k}}`)));
    if (exists) return;

    const type = (k.toLowerCase().includes('photo') || k.toLowerCase().includes('image')) ? 'image' : 'placeholder';
    const elem = {
      id: createId(),
      type,
      x: offsetX,
      y: baseY,
      width: type === 'image' ? 160 : 320,
      height: type === 'image' ? 140 : 48,
      fontSize: 18,
      fontWeight: 600,
      color: '#111827'
    };
    if (type === 'placeholder') {
      elem.placeholder = k;
      elem.text = `{${k}}`;
    } else {
      elem.imageUrl = '';
      // keep a key property for legacy templates
      elem.key = k;
    }

    canvasElements.value.push(elem);
    offsetX += stepX;
    if (offsetX > canvasWidth - 200) {
      offsetX = 40;
      baseY -= 80;
    }
  });

  // select the last added element
  selectedElementId.value = canvasElements.value[canvasElements.value.length - 1]?.id || null;
  selectedElementRef.value = selectedElementId.value ? JSON.parse(JSON.stringify(canvasElements.value.find(e => e.id === selectedElementId.value))) : null;
  syncContentHtml();
};

const removeSelectedElement = () => {
  if (!selectedElementId.value) return;
  canvasElements.value = canvasElements.value.filter((item) => item.id !== selectedElementId.value);
  selectedElementId.value = canvasElements.value[0]?.id || null;
  selectedElementRef.value = selectedElementId.value ? JSON.parse(JSON.stringify(canvasElements.value[0])) : null;
  syncContentHtml();
};

const startInteraction = (event, element, mode = 'move') => {
  event.preventDefault();
  selectedElementId.value = element.id;
  // populate the edit buffer with a shallow clone
  selectedElementRef.value = JSON.parse(JSON.stringify(element));
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
  // if the edit buffer refers to this element, update it too so controls reflect changes
  if (selectedElementRef.value && selectedElementRef.value.id === element.id) {
    selectedElementRef.value = JSON.parse(JSON.stringify(element));
  }
};

const stopInteraction = () => {
  interactionState.value = null;
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', stopInteraction);
};

const clearCanvas = () => {
  canvasElements.value = [];
  selectedElementId.value = null;
  selectedElementRef.value = null;
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

// expose raw JSON for the selected element so user can edit any property
const selectedElementJson = computed({
  get() {
    return selectedElementRef.value ? JSON.stringify(selectedElementRef.value, null, 2) : '';
  },
  set(val) {
    if (!val) return;
    try {
      const parsed = JSON.parse(val);
      // keep the id stable if present
      if (selectedElementRef.value && selectedElementRef.value.id && !parsed.id) parsed.id = selectedElementRef.value.id;
      selectedElementRef.value = parsed;
    } catch (e) {
      // invalid JSON — ignore updates until valid
      console.error('Invalid element JSON', e);
    }
  }
});

// expose additional editable fields (excluding the main controls already present)
const skipFieldKeys = ['id', 'type', 'text', 'placeholder', 'fontSize', 'color', 'width', 'height', 'x', 'y', 'textAlign', 'imageUrl'];
const showAllFields = ref(false);

const extraFields = computed(() => {
  const el = selectedElementRef.value || {};
  const keys = Object.keys(el);
  const visible = showAllFields.value ? keys : keys.filter(k => !skipFieldKeys.includes(k));
  return visible.map(k => ({ key: k, value: el[k] }));
});

const updateField = (key, raw) => {
  if (!selectedElementRef.value) return;
  const copy = { ...selectedElementRef.value };
  // guess type: numeric strings -> number, booleans -> bool
  if (typeof copy[key] === 'number' || (!isNaN(Number(raw)) && raw !== '')) {
    copy[key] = Number(raw);
  } else if (typeof copy[key] === 'boolean') {
    copy[key] = !!raw;
  } else if (key === 'color') {
    const hex = String(raw || '').trim();
    copy[key] = /^#([0-9A-Fa-f]{6})$/.test(hex) ? hex : '#111827';
  } else {
    copy[key] = raw;
  }
  selectedElementRef.value = copy;
};

const saveTemplate = async () => {
  // Sanitize elements: ensure valid hex color and numeric fields to avoid backend validation errors
  const sanitizedElements = (canvasElements.value || []).map((el) => {
    const copy = { ...el };
    // ensure color is a valid #rrggbb hex
    const hex = String(copy.color || '').trim();
    if (!/^#([0-9A-Fa-f]{6})$/.test(hex)) {
      copy.color = '#111827';
    } else {
      copy.color = hex;
    }
    // coerce numeric fields and clamp to canvas bounds to avoid overflow/page breaks
    copy.x = clamp(Number(copy.x) || 0, 0, canvasWidth - 10);
    copy.y = clamp(Number(copy.y) || 0, 0, canvasHeight - 10);
    copy.width = clamp(Number(copy.width) || (copy.type === 'skills_table' ? 480 : 320), 10, canvasWidth);
    copy.height = clamp(Number(copy.height) || (copy.type === 'skills_table' ? 220 : 72), 10, canvasHeight);
    copy.fontSize = Number(copy.fontSize) || 24;
    copy.fontWeight = Number(copy.fontWeight) || 600;
    return copy;
  });

  const formData = new FormData();
  formData.append('name', currentTemplate.value.name);
  formData.append('content_html', currentTemplate.value.content_html || buildContentHtml());
  formData.append('elements_json', JSON.stringify(sanitizedElements));
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

const debugDump = async () => {
  console.group('[TemplateEditor] Debug dump');
  console.log('templateId:', props.templateId);
  console.log('currentTemplate:', JSON.parse(JSON.stringify(currentTemplate.value)));
  console.log('canvasElements:', JSON.parse(JSON.stringify(canvasElements.value)));
  console.log('generated content_html:', currentTemplate.value.content_html || buildContentHtml());
  console.groupEnd();
  showAlert('Dumped template state to console. Open devtools console to copy output.');
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
              <Button label="Import placeholders" icon="pi pi-download" class="p-button-sm p-button-outlined" @click="importPlaceholdersFromHtml" />
            </div>
          </div>

          <div v-if="selectedElementRef" class="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Element settings</h4>
              <Button icon="pi pi-trash" class="p-button-text p-button-sm" @click="removeSelectedElement" />
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</label>
              <select v-model="selectedElementRef.type" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                <option value="text">Text</option>
                <option value="placeholder">Placeholder</option>
                <option value="image">Logo / Image</option>
                <option value="box">Box</option>
                <option value="sign">Signature</option>
                <option value="qr">QR</option>
                <option value="skills_table">Skills Table</option>
              </select>
            </div>

            <div v-if="selectedElementRef.type === 'text'" class="flex flex-col gap-2">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Text</label>
              <InputText v-model="selectedElementRef.text" class="w-full" />
            </div>

            <div v-else-if="selectedElementRef.type === 'placeholder'" class="flex flex-col gap-2">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Placeholder</label>
              <select v-model="selectedElementRef.placeholder" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                <option v-for="option in placeholderOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
            </div>

            <div v-else-if="selectedElementRef.type === 'image'" class="flex flex-col gap-2">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logo Image</label>
              <input type="file" accept="image/*" @change="handleLogoUpload" class="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
              <p class="text-[9px] text-slate-400 italic">PNG or JPG works well for the certificate logo.</p>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="flex flex-col gap-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Font size</label>
                <InputText v-model.number="selectedElementRef.fontSize" type="number" class="w-full" />
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Color</label>
                <input v-model="selectedElementRef.color" type="color" class="h-10 w-full rounded-xl border border-slate-200 bg-white p-1" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="flex flex-col gap-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Width</label>
                <InputText v-model.number="selectedElementRef.width" type="number" class="w-full" />
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Height</label>
                <InputText v-model.number="selectedElementRef.height" type="number" class="w-full" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="flex flex-col gap-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">X</label>
                <InputText v-model.number="selectedElementRef.x" type="number" class="w-full" />
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Y</label>
                <InputText v-model.number="selectedElementRef.y" type="number" class="w-full" />
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alignment</label>
              <select v-model="selectedElementRef.textAlign" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
            <div class="flex flex-col gap-2 mt-3">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Advanced (raw JSON)</label>
              <Textarea v-model="selectedElementJson" class="font-mono text-xs p-3 bg-white text-slate-700 rounded-2xl border border-slate-200 resize-vertical min-h-[140px]" />
              <div class="flex items-center justify-between">
                <p class="text-[9px] text-slate-400 italic">Edit any property directly — changes apply to the canvas when valid JSON is entered.</p>
                <label class="text-[11px] text-slate-600 flex items-center gap-2">
                  <input type="checkbox" v-model="showAllFields" />
                  <span>Show all fields</span>
                </label>
              </div>
            </div>
            <div v-if="extraFields.length" class="flex flex-col gap-2 mt-3">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Other Properties</label>
              <div v-for="field in extraFields" :key="field.key" class="flex items-center gap-3">
                <div class="w-28 text-[11px] text-slate-600 font-semibold">{{ field.key }}</div>
                <div class="flex-1">
                  <template v-if="typeof field.value === 'number'">
                    <input type="number" :value="field.value" @input="e => updateField(field.key, e.target.value)" class="w-full rounded-xl border border-slate-200 px-3 py-2" />
                  </template>
                  <template v-else-if="typeof field.value === 'boolean'">
                    <input type="checkbox" :checked="field.value" @change="e => updateField(field.key, e.target.checked)" />
                  </template>
                  <template v-else-if="field.key.toLowerCase().includes('color')">
                    <input type="color" :value="field.value || '#111827'" @input="e => updateField(field.key, e.target.value)" class="h-10 w-20 rounded-xl" />
                  </template>
                  <template v-else-if="field.key.toLowerCase().includes('image') || field.key === 'imageUrl'">
                    <div class="flex items-center gap-2">
                      <input type="file" accept="image/*" @change="handleLogoUpload" />
                      <div v-if="field.value" class="text-[12px] text-slate-500">(current)</div>
                    </div>
                  </template>
                  <template v-else>
                    <input type="text" :value="field.value" @input="e => updateField(field.key, e.target.value)" class="w-full rounded-xl border border-slate-200 px-3 py-2" />
                  </template>
                </div>
              </div>
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
              <div v-if="!canvasElements.length">
                <div v-if="currentTemplate.content_html" class="absolute inset-0 overflow-auto p-4 bg-white">
                  <div v-html="currentTemplate.content_html"></div>
                </div>
                <div v-else class="absolute inset-0 flex items-center justify-center text-center px-8 text-sm text-slate-400">Start by adding a text block, a placeholder, or a skills table.</div>
              </div>
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
            <Button label="Debug dump" icon="pi pi-info-circle" class="p-button-text p-button-sm" @click="debugDump" />
            <Button label="Save Template" icon="pi pi-check" class="p-button-raised p-button-sm font-black uppercase tracking-widest" @click="saveTemplate" />
      </div>
    </div>
  </AdminLayout>
</template>

