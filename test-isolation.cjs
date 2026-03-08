// Test the exemption logic in isolation
const path = require('path');
const fs = require('fs');

// Load exemptions
const exemptions = JSON.parse(fs.readFileSync('packages/manifest-runtime/packages/cli/src/commands/audit-routes-exemptions.json', 'utf-8'));

// Normalize function from the code
function normalizeRoutePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

// isExempted function from the code
function isExempted(normalizedPath, method, exemptions) {
  for (const exemption of exemptions) {
    const exemptionNormalized = exemption.path.replace(/\\/g, '/');
    if (
      normalizedPath.endsWith(exemptionNormalized) &&
      exemption.methods.includes(method)
    ) {
      return true;
    }
  }
  return false;
}

// Test cases
const testFile = 'C:\\Projects\\capsule-pro\\apps\\api\\app\\api\\user-preferences\\route.ts';
const normalizedFile = normalizeRoutePath(testFile);

console.log('=== Test Results ===');
console.log('Test file:', testFile);
console.log('Normalized:', normalizedFile);
console.log('');

// Check exemption
const result = isExempted(normalizedFile, 'POST', exemptions);
console.log('isExempted(POST):', result);

// Find matching exemption
const matching = exemptions.find(e => {
  const exemptionNormalized = e.path.replace(/\\/g, '/');
  return normalizedFile.endsWith(exemptionNormalized) && e.methods.includes('POST');
});
console.log('Matching exemption:', matching ? matching.path : 'NOT FOUND');
console.log('');

// Check what the exemption path looks like
const userPrefsExemption = exemptions.find(e => e.path.includes('user-preferences'));
console.log('User preferences exemption path:', userPrefsExemption.path);
console.log('Exemption normalized:', userPrefsExemption.path.replace(/\\/g, '/'));
console.log('');

// Manual check
console.log('endsWith check:', normalizedFile.endsWith(userPrefsExemption.path.replace(/\\/g, '/')));
console.log('methods includes POST:', userPrefsExemption.methods.includes('POST'));
