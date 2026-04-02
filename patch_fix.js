const fs = require('fs');
const path = 'd:/banverse1/banverse/node_modules/react-dev-utils/ModuleScopePlugin.js';
let content = fs.readFileSync(path, 'utf8');

const target = `// If this resolves to a node_module, we don't care what happens next
          request.descriptionFileRoot.indexOf('/node_modules/') !== -1 ||
          request.descriptionFileRoot.indexOf('\\\\node_modules\\\\') !== -1 ||`;

const replacement = `// If this resolves to a node_module, we don't care what happens next
          (request.descriptionFileRoot && 
            (request.descriptionFileRoot.indexOf('/node_modules/') !== -1 ||
             request.descriptionFileRoot.indexOf('\\\\node_modules\\\\') !== -1)) ||`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content);
    console.log('Successfully patched ModuleScopePlugin.js');
} else if (content.includes('(request.descriptionFileRoot &&')) {
    console.log('File already patched');
} else {
    console.log('Target content not found in ModuleScopePlugin.js');
}
