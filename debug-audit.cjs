const path = require('path');
const fs = require('fs');

// Simulate what the CLI does
const root = path.resolve(process.cwd(), 'apps/api');
const exemptionsPath = path.resolve('packages/manifest-runtime/packages/cli/src/commands/audit-routes-exemptions.json');

console.log('Root:', root);
console.log('Exemptions path:', exemptionsPath);
console.log('Exemptions file exists:', fs.existsSync(exemptionsPath));

// Load exemptions
const exemptions = JSON.parse(fs.readFileSync(exemptionsPath, 'utf-8'));
console.log('Exemptions loaded:', exemptions.length);

// Check a specific file
const testFile = 'C:/projects/capsule-pro/apps/api/app/api/user-preferences/route.ts';
const normalizedFile = testFile.split(path.sep).join('/');
console.log('\nTest file:', testFile);
console.log('Normalized:', normalizedFile);

// Check if exempted
function isExempted(normalizedPath, method, exemptions) {
  for (const exemption of exemptions) {
    const exemptionNormalized = exemption.path.split(path.sep).join('/');
    if (
      normalizedPath.endsWith(exemptionNormalized) &&
      exemption.methods.includes(method)
    ) {
      return true;
    }
  }
  return false;
}

console.log('Is exempted for POST:', isExempted(normalizedFile, 'POST', exemptions));
console.log('Is exempted for GET:', isExempted(normalizedFile, 'GET', exemptions));
