const fs = require('fs');

const path = require('path');

// Read the compiled JS file
let content = fs.readFileSync(path.join('packages', 'manifest-runtime', 'packages', 'cli', 'dist', 'commands', 'audit-routes.js'), 'utf-8');

// Add debug logging to isExempted function
const oldCode = `function isExempted(normalizedPath, method, exemptions) {
    for (const exemption of exemptions) {
        const exemptionNormalized = exemption.path.replace(/\\\\/g, "/");
        if (
            normalizedPath.endsWith(exemptionNormalized) &&
            exemption.methods.includes(method)
        ) {
            return true;
        }
    }
    return false;
}`;

const newCode = `function isExempted(normalizedPath, method, exemptions) {
    console.error('[DEBUG isExempted] normalizedPath:', normalizedPath, 'method:', method);
    console.error('[DEBUG isExempted] exemptions count:', exemptions ? exemptions.length : 'null/undefined');
    for (const exemption of exemptions) {
        const exemptionNormalized = exemption.path.replace(/\\\\/g, "/");
        const matches = normalizedPath.endsWith(exemptionNormalized);
        console.error('[DEBUG isExempted] checking exemption:', exemptionNormalized, 'matches:', matches);
        if (matches && exemption.methods.includes(method)) {
            console.error('[DEBUG isExempted] MATCH FOUND for method:', method);
            return true;
        }
    }
    console.error('[DEBUG isExempted] NO MATCH found');
    return false;
}`;

content = content.replace(oldCode, newCode);

// Write back
fs.writeFileSync(path.join('packages', 'manifest-runtime', 'packages', 'cli', 'dist', 'commands', 'audit-routes.js'), content);
console.log('Added debug logging to isExempted function');
