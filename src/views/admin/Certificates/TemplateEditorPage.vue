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
          <colgroup>
            <col style=\"width:36%\"> 
            <col style=\"width:12%\"> 
            <col style=\"width:12%\"> 
            <col style=\"width:12%\"> 
            <col style=\"width:12%\"> 
            <col style=\"width:16%\"> 
          </colgroup>
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
          <div class="image-block" style="position:absolute; left:${element.x}px; top:${element.y}px; width:${element.width}px; height:${element.height}px; page-break-inside:avoid;">
            <img src="${imgSrc}" alt="Certificate image" style="width:100%; height:100%; object-fit:contain;" />
          </div>`;
      }

      // placeholder box
      const boxText = escapeHtml(element.text || element.key || 'PHOTO');
      return `
        <div class="image-block" style="position:absolute; left:${element.x}px; top:${element.y}px; width:${element.width}px; height:${element.height}px; border:1px solid #cbd5e1; display:flex; align-items:center; justify-content:center; background:#f8fafc; color:#94a3b8; font-weight:bold; page-break-inside:avoid;">
          ${boxText}
        </div>`;
    }

    // handle signature blocks
    if (element.type === 'sign' || type === 'sign') {
      const signerName = element.name || element.namePlaceholder || element.text || '';
      const signerTitle = element.title || element.signatureTitle || element.title || element.textLines && element.textLines[0] || '';
      const linesHtml = (element.textLines || []).map(l => `<div style="font-size:8px;color:#64748b;">${escapeHtml(l)}</div>`).join('');
      return `
        <div class="sign-block" style="position:absolute; left:${element.x}px; top:${element.y}px; width:${element.width}px; height:${element.height || 80}px; text-align:center; page-break-inside:avoid;">
          <div style="font-size:${element.fontSize || 20}px; color:${element.color || '#2563eb'}; margin:0 0 -5px 0; font-family: 'Dancing Script', cursive;">${escapeHtml(signerName)}</div>
          <div style="font-weight:900;font-size:12px;margin:0;border-top:1px solid #cbd5e1;padding-top:4px;">${escapeHtml(signerTitle)}</div>
          ${linesHtml}
        </div>`;
    }

    // handle QR
    if (element.type === 'qr' || type === 'qr') {
      return `
        <div class="qr-block" style="position:absolute; left:${element.x}px; top:${element.y}px; width:${element.width}px; height:${element.height}px; page-break-inside:avoid;">
          ${element.placeholder || '{qr_code}'}
        </div>`;
    }

    if (element.type === 'image') {
      return `
        <div class="image-block" style="position:absolute; left:${element.x}px; top:${element.y}px; width:${element.width}px; height:${element.height}px; page-break-inside:avoid;">
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

const getDefaultCanvasElements = () => [
  {
    id: createId(),
    type: 'image',
    x: 486,
    y: 30,
    width: 150,
    height: 100,
    imageUrl: '',
    key: 'logo'
  },
  {
    id: createId(),
    type: 'text',
    x: 161,
    y: 155,
    width: 800,
    height: 40,
    fontSize: 32,
    fontWeight: 800,
    color: '#1e293b',
    textAlign: 'center',
    text: 'CERTIFICATE OF ACHIEVEMENT'
  },
  {
    id: createId(),
    type: 'text',
    x: 161,
    y: 205,
    width: 800,
    height: 30,
    fontSize: 18,
    fontWeight: 400,
    color: '#64748b',
    textAlign: 'center',
    text: 'This is to certify that'
  },
  {
    id: createId(),
    type: 'placeholder',
    placeholder: 'name',
    text: 'Student Name',
    x: 161,
    y: 245,
    width: 800,
    height: 50,
    fontSize: 36,
    fontWeight: 700,
    color: '#2563eb',
    textAlign: 'center'
  },
  {
    id: createId(),
    type: 'text',
    x: 161,
    y: 305,
    width: 800,
    height: 30,
    fontSize: 16,
    fontWeight: 400,
    color: '#64748b',
    textAlign: 'center',
    text: 'has successfully completed all requirements of the exam'
  },
  {
    id: createId(),
    type: 'placeholder',
    placeholder: 'exam',
    text: 'Exam Name',
    x: 161,
    y: 345,
    width: 800,
    height: 40,
    fontSize: 24,
    fontWeight: 700,
    color: '#1e293b',
    textAlign: 'center'
  },
  {
    id: createId(),
    type: 'text',
    x: 161,
    y: 395,
    width: 800,
    height: 30,
    fontSize: 14,
    fontWeight: 400,
    color: '#475569',
    textAlign: 'center',
    text: 'with an overall score of {score}% ({total_points} points), achieving the CEFR level: {cefr} ({actfl})'
  },
  {
    id: createId(),
    type: 'skills_table',
    x: 91,
    y: 440,
    width: 940,
    height: 160,
    text: 'Skills table'
  },
  {
    id: createId(),
    type: 'qr',
    placeholder: '{qr_code}',
    x: 91,
    y: 630,
    width: 80,
    height: 80
  },
  {
    id: createId(),
    type: 'placeholder',
    placeholder: 'number',
    text: 'Certificate Number',
    x: 185,
    y: 650,
    width: 250,
    height: 25,
    fontSize: 12,
    fontWeight: 500,
    color: '#64748b',
    textAlign: 'left'
  },
  {
    id: createId(),
    type: 'placeholder',
    placeholder: 'date',
    text: 'Date',
    x: 185,
    y: 675,
    width: 250,
    height: 25,
    fontSize: 12,
    fontWeight: 500,
    color: '#64748b',
    textAlign: 'left'
  },
  {
    id: createId(),
    type: 'sign',
    name: 'Sayed Ramadan',
    namePlaceholder: 'Sayed Ramadan',
    title: 'Program Director',
    textLines: ['ARAB ACADEMY'],
    x: 620,
    y: 630,
    width: 190,
    height: 80,
    fontSize: 20,
    fontWeight: 600,
    color: '#2563eb',
    textAlign: 'center'
  },
  {
    id: createId(),
    type: 'sign',
    name: 'Hanan Dawah',
    namePlaceholder: 'Hanan Dawah',
    title: 'Registrar',
    textLines: ['ARAB ACADEMY'],
    x: 840,
    y: 630,
    width: 190,
    height: 80,
    fontSize: 20,
    fontWeight: 600,
    color: '#2563eb',
    textAlign: 'center'
  }
];

const loadDefaultLayout = () => {
  if (canvasElements.value.length > 0) {
    if (!confirm('Are you sure you want to discard current changes and load the default certificate layout?')) {
      return;
    }
  }
  canvasElements.value = ensureElementIds(getDefaultCanvasElements());
  if (canvasElements.value.length) {
    selectedElementId.value = canvasElements.value[0].id;
    selectedElementRef.value = JSON.parse(JSON.stringify(canvasElements.value[0]));
  }
  syncContentHtml();
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
    canvasElements.value = ensureElementIds(getDefaultCanvasElements());
    if (canvasElements.value.length) {
      selectedElementId.value = canvasElements.value[0].id;
      selectedElementRef.value = JSON.parse(JSON.stringify(canvasElements.value[0]));
    }
    syncContentHtml();
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
  if (element.type === 'sign') {
    return `✍️ Signature: ${element.name || element.namePlaceholder || element.text || 'Name'}`;
  }
  if (element.type === 'qr') {
    return `[QR Code: ${element.placeholder || '{qr_code}'}]`;
  }

  return element.text || 'Edit me';
};

const canvasBackgroundStyle = computed(() => {
  let backgroundUrl = '';
  if (currentTemplate.value.background_image) {
    if (currentTemplate.value.background_image instanceof File) {
      backgroundUrl = URL.createObjectURL(currentTemplate.value.background_image);
    } else {
      const img = String(currentTemplate.value.background_image);
      backgroundUrl = (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:')) ? img : '/storage/' + img;
    }
  }

  return {
    backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : 'radial-gradient(circle at top left, #f8fafc, #f1f5f9)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    aspectRatio: '1123 / 794'
  };
});

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
        @page { size: A4 landscape; margin: 10mm 8mm; }
        html,body { height: 100%; margin:0; padding:0; }
        body { font-family: Arial, Helvetica, sans-serif; background-image: url('${backgroundUrl}'); background-size: cover; background-repeat: no-repeat; display:flex; align-items:center; justify-content:center; }
        /* fixed canvas matching editor (1123×794) to keep layout consistent for PDF */
        .cert-canvas { width: 1123px; height: 794px; position: relative; margin: 0 auto; overflow: hidden; }
        .cert-canvas table { border-collapse: collapse; table-layout: fixed; font-size: 12px; }
        .cert-canvas th, .cert-canvas td { border: 1px solid #cbd5e1; padding: 6px; word-wrap: break-word; }
        .cert-canvas thead tr { background:#f8fafc; }
        .cert-canvas .overall-row td { font-weight:900; background:#f1f5f9; }
        /* avoid breaking key blocks across pages */
        .cert-canvas, .cert-canvas table, .cert-canvas tbody, .cert-canvas thead, .cert-canvas tr, .cert-canvas td { page-break-inside: avoid; }
        .cert-canvas img { max-width:100%; height:auto; }
      </style>
    </head>
    <body>
      <div class="cert-canvas">${processedContent}</div>
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
    <!-- TOP TOOLBAR -->
    <div
      class="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20">
      <div class="flex items-center gap-4">
        <button @click="router.push({ name: 'admin.certificates.templates' })"
          class="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium">
          <i class="pi pi-arrow-left text-xs"></i> Back
        </button>
        <div class="w-px h-5 bg-slate-200"></div>
        <div>
          <span class="text-xs font-black uppercase tracking-widest text-slate-400">Certificate Builder</span>
          <span v-if="props.mode === 'edit'"
            class="ml-2 text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">Editing</span>
          <span v-else class="ml-2 text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">New
            Template</span>
        </div>
      </div>

      <!-- Template Name input in toolbar -->
      <div class="flex items-center gap-3 flex-1 max-w-sm mx-8">
        <InputText v-model="currentTemplate.name" placeholder="Template name..." class="w-full text-sm h-9" />
      </div>

      <div class="flex items-center gap-2">
        <div class="flex items-center gap-2 mr-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200">
          <Checkbox v-model="currentTemplate.is_default" :binary="true" inputId="is_default_toolbar" />
          <label for="is_default_toolbar"
            class="text-[11px] font-semibold text-slate-500 cursor-pointer whitespace-nowrap">Set as Default</label>
        </div>
        <Button label="Save Template" icon="pi pi-check"
          class="p-button-raised p-button-sm font-black uppercase tracking-wider" @click="saveTemplate" />
      </div>
    </div>

    <div v-if="isLoading" class="flex justify-center items-center h-[calc(100vh-130px)]">
      <div class="flex flex-col items-center gap-4">
        <i class="pi pi-spin pi-spinner text-5xl text-brand-primary opacity-50"></i>
        <p class="text-slate-400 text-sm font-medium">Loading template...</p>
      </div>
    </div>

    <!-- 3-COLUMN EDITOR LAYOUT -->
    <div v-else class="flex h-[calc(100vh-112px)] overflow-hidden bg-slate-100">

      <!-- ===== LEFT PANEL: Element Palette ===== -->
      <div class="w-56 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
        <div class="p-4 border-b border-slate-200">
          <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-400">Elements</h3>
          <p class="text-[9px] text-slate-400 mt-0.5">Click to add to canvas</p>
        </div>

        <div class="p-3 space-y-1.5">
          <!-- Static Text -->
          <button @click="addElement('text')"
            class="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group text-left">
            <div
              class="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors flex-shrink-0">
              <i class="pi pi-align-left text-slate-500 text-xs"></i>
            </div>
            <div>
              <div class="text-xs font-bold text-slate-700">Text</div>
              <div class="text-[9px] text-slate-400">Static text label</div>
            </div>
          </button>

          <!-- Placeholder -->
          <button @click="addElement('placeholder')"
            class="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all group text-left">
            <div
              class="w-8 h-8 rounded-lg bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors flex-shrink-0">
              <i class="pi pi-tag text-blue-600 text-xs"></i>
            </div>
            <div>
              <div class="text-xs font-bold text-slate-700">Placeholder</div>
              <div class="text-[9px] text-slate-400">Dynamic data field</div>
            </div>
          </button>

          <!-- Logo/Image -->
          <button @click="addElement('image')"
            class="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-violet-50 border border-transparent hover:border-violet-200 transition-all group text-left">
            <div
              class="w-8 h-8 rounded-lg bg-violet-100 group-hover:bg-violet-200 flex items-center justify-center transition-colors flex-shrink-0">
              <i class="pi pi-image text-violet-600 text-xs"></i>
            </div>
            <div>
              <div class="text-xs font-bold text-slate-700">Logo / Image</div>
              <div class="text-[9px] text-slate-400">Upload an image</div>
            </div>
          </button>

          <!-- Skills Table -->
          <button @click="addElement('skills_table')"
            class="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-all group text-left">
            <div
              class="w-8 h-8 rounded-lg bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center transition-colors flex-shrink-0">
              <i class="pi pi-table text-emerald-600 text-xs"></i>
            </div>
            <div>
              <div class="text-xs font-bold text-slate-700">Skills Table</div>
              <div class="text-[9px] text-slate-400">Score results grid</div>
            </div>
          </button>

          <!-- Signature -->
          <button @click="addElement('sign')"
            class="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-all group text-left">
            <div
              class="w-8 h-8 rounded-lg bg-amber-100 group-hover:bg-amber-200 flex items-center justify-center transition-colors flex-shrink-0">
              <i class="pi pi-pencil text-amber-600 text-xs"></i>
            </div>
            <div>
              <div class="text-xs font-bold text-slate-700">Signature</div>
              <div class="text-[9px] text-slate-400">Signatory block</div>
            </div>
          </button>

          <!-- QR Code -->
          <button @click="addElement('qr')"
            class="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all group text-left">
            <div
              class="w-8 h-8 rounded-lg bg-rose-100 group-hover:bg-rose-200 flex items-center justify-center transition-colors flex-shrink-0">
              <i class="pi pi-qrcode text-rose-600 text-xs"></i>
            </div>
            <div>
              <div class="text-xs font-bold text-slate-700">QR Code</div>
              <div class="text-[9px] text-slate-400">Verification QR</div>
            </div>
          </button>
        </div>

        <div class="border-t border-slate-100 p-3 space-y-1.5">
          <p class="text-[9px] font-black uppercase tracking-widest text-slate-300 px-1 pb-1">Canvas Actions</p>

          <button @click="loadDefaultLayout"
            class="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors">
            <i class="pi pi-refresh text-xs"></i> Load Default Layout
          </button>

          <button @click="importPlaceholdersFromHtml"
            class="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors">
            <i class="pi pi-download text-xs"></i> Import Placeholders
          </button>

          <button @click="clearCanvas"
            class="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors">
            <i class="pi pi-trash text-xs"></i> Clear Canvas
          </button>
        </div>

        <!-- Background Image -->
        <div class="border-t border-slate-100 p-3 mt-auto">
          <p class="text-[9px] font-black uppercase tracking-widest text-slate-300 pb-2">Background Image</p>
          <label
            class="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-brand-primary hover:bg-blue-50/50 cursor-pointer transition-all">
            <i class="pi pi-image text-slate-400 text-lg"></i>
            <span class="text-[10px] font-semibold text-slate-500 text-center">Click to upload<br />A4 Landscape
              (1123×794)</span>
            <input type="file" accept="image/*" @change="handleFileUpload" class="hidden" />
          </label>
          <p v-if="currentTemplate.background_image"
            class="text-[9px] text-emerald-600 font-semibold mt-1.5 text-center">
            ✓ Background set
          </p>
        </div>
      </div>

      <!-- ===== CENTER: Canvas Area ===== -->
      <div class="flex-1 overflow-auto flex flex-col items-center py-6 px-8 bg-slate-100">
        <!-- Canvas header info -->
        <div class="flex items-center justify-between w-full max-w-[1200px] mb-3">
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Visual Canvas</span>
            <span class="text-[9px] bg-slate-200 text-slate-500 font-bold px-2 py-0.5 rounded-full">A4 Landscape ·
              1123×794px</span>
          </div>
          <div class="flex items-center gap-1.5 text-[9px] text-slate-400 font-medium">
            <i class="pi pi-info-circle text-[9px]"></i>
            <span>Click an element to select → Drag to move → Corner handle to resize</span>
          </div>
        </div>

        <!-- The actual canvas board -->
        <div class="w-full max-w-[1200px] shadow-2xl rounded-2xl border border-slate-300 overflow-hidden flex-shrink-0"
          style="aspect-ratio: 1123 / 794;">
          <div ref="boardRef" class="relative w-full h-full bg-cover bg-center bg-no-repeat overflow-hidden"
            :style="canvasBackgroundStyle">

            <!-- Empty state -->
            <div v-if="!canvasElements.length"
              class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-50/90">
              <i class="pi pi-plus-circle text-slate-200" style="font-size:3rem;"></i>
              <p class="text-slate-400 text-sm font-medium">Canvas is empty — add elements from the left panel</p>
              <button @click="loadDefaultLayout"
                class="mt-1 px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-xl hover:opacity-90 transition">
                Load Default Certificate Layout
              </button>
            </div>

            <!-- Canvas Elements -->
            <div v-for="el in canvasElements" :key="el.id" class="absolute select-none cursor-move"
              :style="{ left: el.x + 'px', top: el.y + 'px', width: el.width + 'px', height: el.height + 'px' }"
              :class="selectedElementId === el.id ? 'z-10' : 'z-0'" @pointerdown="startInteraction($event, el, 'move')">

              <!-- Selection ring -->
              <div class="absolute inset-0 rounded pointer-events-none transition-all duration-100" :class="selectedElementId === el.id
                ? 'ring-2 ring-offset-0 ring-blue-500 bg-blue-500/5'
                : 'ring-1 ring-slate-300/50 hover:ring-slate-400/70'">
              </div>

              <!-- TYPE BADGE (shown when selected) -->
              <div v-if="selectedElementId === el.id"
                class="absolute -top-5 left-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-white text-[8px] font-black uppercase tracking-wider whitespace-nowrap z-20"
                :class="{
                  'bg-slate-600': el.type === 'text',
                  'bg-blue-600': el.type === 'placeholder',
                  'bg-violet-600': el.type === 'image',
                  'bg-emerald-600': el.type === 'skills_table',
                  'bg-amber-600': el.type === 'sign',
                  'bg-rose-600': el.type === 'qr'
                }">
                <i class="pi" :class="{
                  'pi-align-left': el.type === 'text',
                  'pi-tag': el.type === 'placeholder',
                  'pi-image': el.type === 'image',
                  'pi-table': el.type === 'skills_table',
                  'pi-pencil': el.type === 'sign',
                  'pi-qrcode': el.type === 'qr'
                }" style="font-size:7px;"></i>
                {{ el.type === 'skills_table' ? 'Skills Table' : el.type }}
              </div>

              <!-- ELEMENT CONTENT RENDERING -->

              <!-- Image / Logo -->
              <div v-if="el.type === 'image'" class="w-full h-full flex items-center justify-center rounded">
                <img v-if="el.imageUrl" :src="el.imageUrl" class="w-full h-full object-contain" />
                <div v-else
                  class="w-full h-full flex flex-col items-center justify-center gap-1 border-2 border-dashed border-violet-300 rounded bg-violet-50/60">
                  <i class="pi pi-image text-violet-400 text-lg"></i>
                  <span class="text-[9px] font-bold text-violet-400 uppercase tracking-wide">Upload Logo</span>
                </div>
              </div>

              <!-- Skills Table -->
              <div v-else-if="el.type === 'skills_table'"
                class="w-full h-full bg-white/90 backdrop-blur-sm rounded border border-emerald-200/80 shadow-sm overflow-hidden">
                <div class="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border-b border-emerald-200">
                  <i class="pi pi-table text-emerald-500 text-[9px]"></i>
                  <span class="text-[8px] font-black uppercase tracking-widest text-emerald-600">Skills Table · Drag to
                    reposition</span>
                </div>
                <table class="w-full border-collapse text-[8px] text-slate-600">
                  <thead class="bg-slate-50">
                    <tr>
                      <th class="border border-slate-200 px-1.5 py-1 text-left font-bold text-slate-500">Section</th>
                      <th class="border border-slate-200 px-1.5 py-1 font-bold text-slate-500">Score</th>
                      <th class="border border-slate-200 px-1.5 py-1 font-bold text-slate-500">Score%</th>
                      <th class="border border-slate-200 px-1.5 py-1 font-bold text-slate-500">CEFR</th>
                      <th class="border border-slate-200 px-1.5 py-1 font-bold text-slate-500">ACTFL</th>
                      <th class="border border-slate-200 px-1.5 py-1 font-bold text-slate-500">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="text-emerald-700 font-medium">
                      <td class="border border-slate-200 px-1.5 py-1 italic text-[7px] text-slate-300" colspan="6"
                        style="text-align:center;">{skills_table} — will be filled automatically</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Signature -->
              <div v-else-if="el.type === 'sign'"
                class="w-full h-full flex flex-col items-center justify-end bg-amber-50/60 border-2 border-dashed border-amber-300 rounded p-1">
                <div class="text-center flex-1 flex items-end justify-center pb-1">
                  <span
                    :style="{ fontSize: Math.min((el.fontSize || 20), 18) + 'px', color: el.color || '#2563eb', fontFamily: 'cursive', fontWeight: 600 }">
                    {{ el.name || el.namePlaceholder || 'Signer Name' }}
                  </span>
                </div>
                <div class="w-full border-t border-amber-400/60 pt-1 text-center">
                  <div class="text-[7px] font-black uppercase tracking-wide text-amber-700">{{ el.title || 'Title / Role' }}</div>
                </div>
              </div>

              <!-- QR Code -->
              <div v-else-if="el.type === 'qr'"
                class="w-full h-full flex flex-col items-center justify-center gap-1 border-2 border-dashed border-rose-300 rounded bg-rose-50/60">
                <div class="grid grid-cols-3 gap-0.5 w-8 h-8 opacity-40">
                  <div v-for="n in 9" :key="n" class="rounded-sm"
                    :class="[1, 3, 7, 9, 5].includes(n) ? 'bg-rose-600' : 'bg-rose-300'"></div>
                </div>
                <span class="text-[7px] font-black text-rose-500 uppercase tracking-wide">QR Code</span>
              </div>

              <!-- Text & Placeholder -->
              <div v-else class="w-full h-full flex items-center overflow-hidden bg-transparent"
                :style="{ justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start' }">
                <span
                  :style="{ fontSize: (el.fontSize || 24) + 'px', fontWeight: el.fontWeight || 600, color: el.color || '#111827', textAlign: el.textAlign || 'left', lineHeight: 1.2, whiteSpace: 'pre-wrap', width: '100%' }"
                  :class="el.type === 'placeholder' ? 'opacity-80' : ''">
                  {{ el.type === 'placeholder' ? ('{' + (el.placeholder || 'name') + '}') : (el.text || 'Text') }}
                </span>
              </div>

              <!-- Resize handle (bottom-right) -->
              <div v-if="selectedElementId === el.id"
                class="absolute -right-1.5 -bottom-1.5 w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full cursor-se-resize shadow z-30"
                @pointerdown.stop="startInteraction($event, el, 'resize')">
              </div>
            </div>
          </div>
        </div>

        <!-- Elements List (small nav below canvas) -->
        <div v-if="canvasElements.length" class="w-full max-w-[1200px] mt-4">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-[9px] font-black uppercase tracking-widest text-slate-400 mr-1">Layers:</span>
            <button v-for="el in canvasElements" :key="el.id"
              @click="selectedElementId = el.id; selectedElementRef = JSON.parse(JSON.stringify(el))"
              class="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold border transition-all" :class="selectedElementId === el.id
                ? {
                  'bg-blue-600 text-white border-blue-600': el.type === 'placeholder',
                  'bg-slate-700 text-white border-slate-700': el.type === 'text',
                  'bg-violet-600 text-white border-violet-600': el.type === 'image',
                  'bg-emerald-600 text-white border-emerald-600': el.type === 'skills_table',
                  'bg-amber-600 text-white border-amber-600': el.type === 'sign',
                  'bg-rose-600 text-white border-rose-600': el.type === 'qr'
                }
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'">
              <i class="pi" :class="{
                'pi-align-left': el.type === 'text',
                'pi-tag': el.type === 'placeholder',
                'pi-image': el.type === 'image',
                'pi-table': el.type === 'skills_table',
                'pi-pencil': el.type === 'sign',
                'pi-qrcode': el.type === 'qr'
              }" style="font-size:8px;"></i>
              {{ el.type === 'placeholder' ? ('{' + el.placeholder + '}') : el.type === 'text' ? ((el.text || 'text').slice(0, 14) + ((el.text || '').length > 14 ? '…' : '')) : el.type === 'sign' ? (el.name?.slice(0, 10) || 'sign') : el.type }}
            </button>
          </div>
        </div>
      </div>

      <!-- ===== RIGHT PANEL: Property Inspector ===== -->
      <div class="w-72 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-y-auto">
        <div v-if="!selectedElementRef" class="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div class="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <i class="pi pi-cursor text-slate-300 text-2xl"></i>
          </div>
          <p class="text-slate-400 text-sm font-medium">Select an element on the canvas to edit its properties</p>
        </div>

        <div v-else class="flex flex-col h-full">
          <!-- Inspector Header -->
          <div class="p-4 border-b border-slate-200 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-lg flex items-center justify-center text-white" :class="{
                'bg-slate-600': selectedElementRef.type === 'text',
                'bg-blue-600': selectedElementRef.type === 'placeholder',
                'bg-violet-600': selectedElementRef.type === 'image',
                'bg-emerald-600': selectedElementRef.type === 'skills_table',
                'bg-amber-600': selectedElementRef.type === 'sign',
                'bg-rose-600': selectedElementRef.type === 'qr'
              }">
                <i class="pi text-xs" :class="{
                  'pi-align-left': selectedElementRef.type === 'text',
                  'pi-tag': selectedElementRef.type === 'placeholder',
                  'pi-image': selectedElementRef.type === 'image',
                  'pi-table': selectedElementRef.type === 'skills_table',
                  'pi-pencil': selectedElementRef.type === 'sign',
                  'pi-qrcode': selectedElementRef.type === 'qr'
                }"></i>
              </div>
              <div>
                <div class="text-xs font-black uppercase tracking-wide text-slate-700 capitalize">{{
                  selectedElementRef.type === 'skills_table' ? 'Skills Table' : selectedElementRef.type }}</div>
                <div class="text-[9px] text-slate-400">Element Properties</div>
              </div>
            </div>
            <button @click="removeSelectedElement"
              class="w-7 h-7 rounded-lg hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-slate-400 transition-colors border border-transparent hover:border-red-200">
              <i class="pi pi-trash text-xs"></i>
            </button>
          </div>

          <!-- Inspector Body -->
          <div class="flex-1 overflow-y-auto p-4 space-y-5">

            <!-- Type selector -->
            <div class="space-y-1.5">
              <label class="text-[9px] font-black uppercase tracking-widest text-slate-400">Element Type</label>
              <select v-model="selectedElementRef.type"
                class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
                <option value="text">Text</option>
                <option value="placeholder">Placeholder</option>
                <option value="image">Logo / Image</option>
                <option value="sign">Signature</option>
                <option value="qr">QR Code</option>
                <option value="skills_table">Skills Table</option>
              </select>
            </div>

            <!-- Content section per type -->
            <div class="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-3">
              <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">Content</p>

              <!-- Text content -->
              <div v-if="selectedElementRef.type === 'text'" class="space-y-1.5">
                <label class="text-[10px] font-semibold text-slate-500">Text</label>
                <Textarea v-model="selectedElementRef.text" class="w-full text-sm min-h-[60px] resize-none" />
              </div>

              <!-- Placeholder content -->
              <div v-else-if="selectedElementRef.type === 'placeholder'" class="space-y-1.5">
                <label class="text-[10px] font-semibold text-slate-500">Data Field</label>
                <select v-model="selectedElementRef.placeholder"
                  class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium">
                  <option v-for="option in placeholderOptions" :key="option.value" :value="option.value">{{ option.label
                  }}</option>
                </select>
                <div class="flex items-center gap-2 px-2 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
                  <i class="pi pi-tag text-blue-500 text-[9px]"></i>
                  <span class="text-[9px] font-mono font-bold text-blue-700">{{ '{' }}{{ selectedElementRef.placeholder
                    || 'name' }}{{ '}' }}</span>
                </div>
              </div>

              <!-- Image content -->
              <div v-else-if="selectedElementRef.type === 'image'" class="space-y-2">
                <label class="text-[10px] font-semibold text-slate-500">Logo Image</label>
                <div v-if="selectedElementRef.imageUrl"
                  class="w-full h-20 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                  <img :src="selectedElementRef.imageUrl" class="max-w-full max-h-full object-contain" />
                </div>
                <label
                  class="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-violet-300 hover:border-violet-500 bg-violet-50 hover:bg-violet-100 cursor-pointer transition-all">
                  <i class="pi pi-upload text-violet-500 text-xs"></i>
                  <span class="text-[10px] font-bold text-violet-600">{{ selectedElementRef.imageUrl ? 'Replace Image' :
                    'Upload Image' }}</span>
                  <input type="file" accept="image/*" @change="handleLogoUpload" class="hidden" />
                </label>
              </div>

              <!-- Signature content -->
              <div v-else-if="selectedElementRef.type === 'sign'" class="space-y-2">
                <div>
                  <label class="text-[10px] font-semibold text-slate-500">Signer Name</label>
                  <InputText v-model="selectedElementRef.name" class="w-full mt-1 text-sm" placeholder="John Doe" />
                </div>
                <div>
                  <label class="text-[10px] font-semibold text-slate-500">Title / Role</label>
                  <InputText v-model="selectedElementRef.title" class="w-full mt-1 text-sm"
                    placeholder="Program Director" />
                </div>
              </div>

              <!-- QR content -->
              <div v-else-if="selectedElementRef.type === 'qr'" class="space-y-1.5">
                <label class="text-[10px] font-semibold text-slate-500">QR Placeholder</label>
                <InputText v-model="selectedElementRef.placeholder" class="w-full text-sm font-mono"
                  placeholder="{qr_code}" />
                <p class="text-[9px] text-slate-400">This will be replaced with the actual QR image at PDF generation
                  time.</p>
              </div>

              <!-- Skills table: no content options needed -->
              <div v-else-if="selectedElementRef.type === 'skills_table'">
                <p class="text-[10px] text-slate-400 italic">The skills table is auto-populated with the student's skill
                  scores. Just position it on the canvas.</p>
              </div>
            </div>

            <!-- Typography (hide for image, qr, table) -->
            <div v-if="!['image', 'qr', 'skills_table'].includes(selectedElementRef.type)"
              class="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-3">
              <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">Typography</p>

              <div class="grid grid-cols-2 gap-2">
                <div class="space-y-1">
                  <label class="text-[9px] font-semibold text-slate-500">Font Size (px)</label>
                  <input type="number" v-model.number="selectedElementRef.fontSize" min="6" max="120"
                    class="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
                </div>
                <div class="space-y-1">
                  <label class="text-[9px] font-semibold text-slate-500">Color</label>
                  <div class="flex items-center gap-1.5">
                    <input type="color" v-model="selectedElementRef.color"
                      class="h-8 w-10 rounded-lg border border-slate-200 p-0.5 cursor-pointer bg-white" />
                    <input type="text" v-model="selectedElementRef.color" maxlength="7"
                      class="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-mono bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary/30" />
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div class="space-y-1">
                  <label class="text-[9px] font-semibold text-slate-500">Font Weight</label>
                  <select v-model.number="selectedElementRef.fontWeight"
                    class="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm bg-white focus:outline-none">
                    <option :value="300">Light</option>
                    <option :value="400">Regular</option>
                    <option :value="500">Medium</option>
                    <option :value="600">SemiBold</option>
                    <option :value="700">Bold</option>
                    <option :value="800">ExtraBold</option>
                    <option :value="900">Black</option>
                  </select>
                </div>
                <div class="space-y-1">
                  <label class="text-[9px] font-semibold text-slate-500">Alignment</label>
                  <div class="flex gap-1">
                    <button v-for="align in ['left', 'center', 'right']" :key="align"
                      @click="selectedElementRef.textAlign = align"
                      class="flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all"
                      :class="selectedElementRef.textAlign === align ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'">
                      <i class="pi"
                        :class="{ 'pi-align-left': align === 'left', 'pi-align-center': align === 'center', 'pi-align-right': align === 'right' }"
                        style="font-size:10px;"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Position & Size -->
            <div class="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-3">
              <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">Position & Size</p>
              <div class="grid grid-cols-2 gap-2">
                <div class="space-y-1">
                  <label class="text-[9px] font-semibold text-slate-500">X (left)</label>
                  <input type="number" v-model.number="selectedElementRef.x"
                    class="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
                </div>
                <div class="space-y-1">
                  <label class="text-[9px] font-semibold text-slate-500">Y (top)</label>
                  <input type="number" v-model.number="selectedElementRef.y"
                    class="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
                </div>
                <div class="space-y-1">
                  <label class="text-[9px] font-semibold text-slate-500">Width</label>
                  <input type="number" v-model.number="selectedElementRef.width"
                    class="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
                </div>
                <div class="space-y-1">
                  <label class="text-[9px] font-semibold text-slate-500">Height</label>
                  <input type="number" v-model.number="selectedElementRef.height"
                    class="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
                </div>
              </div>
            </div>

            <!-- Raw JSON (collapsible) -->
            <details class="rounded-xl border border-slate-100 overflow-hidden">
              <summary
                class="flex items-center gap-2 p-3 cursor-pointer bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400 select-none hover:bg-slate-100 transition-colors">
                <i class="pi pi-code text-[9px]"></i>
                Raw JSON (advanced)
              </summary>
              <div class="p-2 bg-slate-900">
                <Textarea v-model="selectedElementJson"
                  class="w-full font-mono text-[10px] bg-slate-900 text-emerald-400 border-none outline-none resize-none min-h-[100px] p-1" />
              </div>
            </details>

          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
