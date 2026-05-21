<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue';
import Keyboard from 'simple-keyboard';
import 'simple-keyboard/build/css/index.css';
import { useVirtualKeyboard } from '@/composables/useVirtualKeyboard';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  inputName: {
    type: String,
    default: 'default'
  },
  layout: {
    type: String,
    default: 'english' // 'english' or 'arabic'
  }
});

const emit = defineEmits(['update:modelValue', 'change', 'keypress']);

const keyboard = ref(null);
const keyboardRef = ref(null);

const { triggerKeyPress, onKeyPressCallback } = useVirtualKeyboard();

const layouts = {
  english: {
    default: [
      "` 1 2 3 4 5 6 7 8 9 0 - = {bksp}",
      "{tab} q w e r t y u i o p [ ] \\",
      "{lock} a s d f g h j k l ; ' {enter}",
      "{shift} z x c v b n m , . / {shift}",
      ".com @ {space}"
    ],
    shift: [
      "~ ! @ # $ % ^ & * ( ) _ + {bksp}",
      "{tab} Q W E R T Y U I O P { } |",
      '{lock} A S D F G H J K L : " {enter}',
      "{shift} Z X C V B N M < > ? {shift}",
      ".com @ {space}"
    ]
  },
  arabic: {
    default: [
      "\u0630 1 2 3 4 5 6 7 8 9 0 - = {bksp}",
      "{tab} \u0636 \u0635 \u062b \u0642 \u0641 \u063a \u0639 \u0647 \u062e \u062d \u062c \u062f \\",
      "{lock} \u0634 \u0633 \u064a \u0628 \u0644 \u0627 \u062a \u0646 \u0645 \u0643 \u0637 {enter}",
      "{shift} \u0626 \u0621 \u0624 \u0631 \u0644\u0627 \u0649 \u0629 \u0648 \u0632 \u0638 {shift}",
      ".com @ {space}"
    ],
    shift: [
      "\u0651 ! @ # $ % ^ & * ( ) _ + {bksp}",
      "{tab} \u064e \u064b \u064f \u064c \u0644\u0625 \u0625 \u2018 \u2019 \u00d7 \u061b < > |",
      "{lock} \u0650 \u064d \u0644\u0623 \u0623 \u0640 \u060c / : \" \u061f {enter}",
      "{shift} \u0622 \u0644\u0622 \u0671 \u060c . \u0640 \u060c \u060c \u060c {shift}",
      ".com @ {space}"
    ]
  }
};

onMounted(() => {

  const KeyboardConstructor = Keyboard.default || Keyboard;
  try {
    keyboard.value = new KeyboardConstructor(keyboardRef.value, {
      onChange: (input) => {
        if (!onKeyPressCallback.value) {
          emit('update:modelValue', input);
          emit('change', input);
        }
      },
      onKeyPress: (button) => {
        handleKeyPress(button);
        emit('keypress', button);
        if (onKeyPressCallback.value) {
          triggerKeyPress(button);
        }
      },
      layout: layouts[props.layout],
      display: {
        '{bksp}': 'delete',
        '{enter}': 'enter',
        '{shift}': 'shift',
        '{tab}': 'tab',
        '{lock}': 'caps',
        '{space}': 'space'
      }
    });

    if (!onKeyPressCallback.value) {
      keyboard.value.setInput(props.modelValue);
    }

  } catch (err) {
    
  }
});

const handleKeyPress = (button) => {
  if (button === "{shift}" || button === "{lock}") {
    const currentLayout = keyboard.value.options.layoutName;
    const shiftToggle = currentLayout === "default" ? "shift" : "default";
    keyboard.value.setOptions({
      layoutName: shiftToggle
    });
  }
};

watch(() => props.modelValue, (newVal) => {
  if (!onKeyPressCallback.value && keyboard.value && newVal !== keyboard.value.getInput()) {
    keyboard.value.setInput(newVal);
  }
});

watch(() => props.layout, (newLayout) => {
  if (keyboard.value) {
    keyboard.value.setOptions({
      layout: layouts[newLayout]
    });
  }
});

onUnmounted(() => {
  if (keyboard.value) {
    keyboard.value.destroy();
  }
});
</script>

<template>
  <div class="virtual-keyboard-wrapper p-4 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner min-h-[200px] relative z-50">
    <div class="absolute top-1 left-2 text-[8px] text-slate-300 font-bold">V-KB</div>
    <div ref="keyboardRef" class="simple-keyboard"></div>
  </div>
</template>

<style>
.simple-keyboard {
  background-color: transparent !important;
  font-family: inherit;
}

.hg-button {
  height: 45px !important;
  background: white !important;
  border-bottom: 3px solid #e2e8f0 !important;
  border-radius: 10px !important;
  font-weight: 800 !important;
  font-size: 14px !important;
  color: #1e293b !important;
  transition: all 0.1s ease !important;
}

.hg-button:active {
  transform: translateY(2px) !important;
  border-bottom-width: 1px !important;
}

.hg-button.hg-standardBtn {
  width: calc(100% / 15) !important;
}

.hg-button.hg-functionBtn {
  background-color: #f8fafc !important;
  color: #64748b !important;
  font-size: 11px !important;
  text-transform: uppercase !important;
}

.hg-theme-default .hg-button.hg-activeButton {
  background-color: #4f46e5 !important;
  color: white !important;
  border-bottom-color: #4338ca !important;
}
</style>
