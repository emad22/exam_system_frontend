const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.vue')) {
            processFile(fullPath);
        }
    }
}

function processFile(file) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Skip if no alert/confirm or if it's the ones we already did manually
    if (!/alert\(|confirm\(/.test(content)) return;
    
    // We already manually converted AdminReportShow, Questions/index, Students/index, partner/Reports/show
    if (file.includes('AdminReportShow.vue') || 
        file.includes('Questions\\\\index.vue') || file.includes('Questions/index.vue') ||
        file.includes('Students\\\\index.vue') || file.includes('Students/index.vue') ||
        file.includes('partner\\\\Reports\\\\show.vue') || file.includes('partner/Reports/show.vue')) {
        return;
    }

    let original = content;

    content = content.replace(/!confirm\(([^)]+)\)/g, '!(await showConfirm($1))');
    content = content.replace(/confirm\(([^)]+)\)/g, 'await showConfirm($1)');
    content = content.replace(/alert\(([^)]+)\)/g, 'showAlert($1)');

    // Add import if needed
    if (!content.includes('useModal')) {
        content = content.replace(/<script setup>/, `<script setup>\nimport { useModal } from '@/composables/useModal';`);
        
        // Add const { showAlert, showConfirm } = useModal(); after the last import
        const lines = content.split('\n');
        let lastImportIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('import ')) {
                lastImportIndex = i;
            }
        }
        
        if (lastImportIndex !== -1) {
            lines.splice(lastImportIndex + 1, 0, '\nconst { showAlert, showConfirm } = useModal();');
            content = lines.join('\n');
        } else {
            content = content.replace(/<script setup>\n/, `<script setup>\nconst { showAlert, showConfirm } = useModal();\n`);
        }
    }

    // Now we must ensure any function calling await is async.
    // Let's replace 'const myFunc = (' with 'const myFunc = async (' if it contains await inside its body.
    // This regex is hard to do perfectly, so we'll just forcefully make arrow functions async if they aren't.
    content = content.replace(/const\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*\{/g, (match, name, args) => {
        return `const ${name} = async (${args}) => {`;
    });

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated ' + file);
    }
}

processDir('src');
