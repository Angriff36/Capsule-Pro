const fs = require('fs');

// Read the compiled JS file
let content = fs.readFileSync('packages/manifest-runtime/packages/cli/dist/commands/audit-routes.js', 'utf-8');

// Add debug to show the normalizedFile before the check
const debugLine = '            console.error("DEBUG normalizedFile:", normalizedFile, "includes user-prefs:", normalizedFile.includes("user-preferences"));';
content = content.replace(
  'if (normalizedFile.includes("user-preferences"))',
  debugLine + '\n            if (normalizedFile.includes("user-preferences"))'
);

// Write back
fs.writeFileSync('packages/manifest-runtime/packages/cli/dist/commands/audit-routes.js', content);
console.log('Added more debug logging');
