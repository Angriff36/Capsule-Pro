const path = require('path');
const fs = require('fs');
const glob = require('glob');

// Load exemptions
const exemptionsPath = path.resolve('packages/manifest-runtime/packages/cli/src/commands/audit-routes-exemptions.json');
const exemptions = JSON.parse(fs.readFileSync(exemptionsPath, 'utf-8'));
console.log('Loaded exemptions:', exemptions.length);

// Discover route files like the CLI does
const root = path.resolve(process.cwd(), 'apps/api');
const ROUTE_PATTERNS = [
  'app/api/**/route.ts',
  'app/api/**/route.js',
  'src/app/api/**/route.ts',
  'src/app/api/**/route.js',
  'apps/*/app/api/**/route.ts',
  'apps/*/app/api/**/route.js',
];

let allFiles = [];
for (const pattern of ROUTE_PATTERNS) {
  const files = glob.sync(pattern, {
    cwd: root,
    absolute: true,
    ignore: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
    ],
  });
  allFiles = allFiles.concat(files);
}

// Dedupe
const routeFiles = [...new Set(allFiles)];
console.log('Found route files:', routeFiles.length);

// Find user-preferences file
const userPrefsFile = routeFiles.find(f => f.includes('user-preferences'));
console.log('\nUser preferences file:', userPrefsFile);

// Simulate the audit logic
function normalizeRoutePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

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

// Check the file
const normalizedFile = normalizeRoutePath(userPrefsFile);
console.log('Normalized file:', normalizedFile);

const exempted = isExempted(normalizedFile, 'POST', exemptions);
console.log('Is exempted for POST:', exempted);

// Find the matching exemption
const matchingExemption = exemptions.find(e => {
  const exemptionNormalized = e.path.replace(/\\/g, '/');
  return normalizedFile.endsWith(exemptionNormalized) && e.methods.includes('POST');
});
console.log('Matching exemption:', matchingExemption ? matchingExemption.path : 'NOT FOUND');
