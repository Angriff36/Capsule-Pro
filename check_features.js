const fs = require('fs');
const path = require('path');

// Features to check
const features = [
  'event-automated-followup',
  'multi-channel-marketing', 
  'advanced-event-analytics',
  'route-optimization',
  'event-profitability-analysis',
  'communication-preferences',
  'nutrition-label-generator',
  'workforce-management-ai',
  'knowledge-base-manager',
  'contract-lifecycle-management',
  'document-version-control',
  'procurement-automation',
  'vendor-catalog-management',
  'soft-delete-recovery',
  'revenue-cycle-management',
  'real-time-presence-indicators',
  'kitchen-digital-twin',
  'real-time-kitchen-monitoring',
  'quality-assurance-dashboard',
  'quality-control-workflow',
  'operational-bottleneck-detector',
  'multi-location-dashboards',
  'facility-management-system',
  'multi-location-support',
  'menu-engineering-tools',
  'manifest-test-playground',
  'manifest-command-telemetry',
  'integrated-payment-processor',
  'equipment-maintenance-scheduler',
  'equipment-scheduling-conflicts',
  'entity-annotation-system',
  'collaboration-workspace',
  'ai-simulation-engine',
  'board-fork-and-merge',
  'board-template-system',
  'api-rate-limiting',
  'api-key-management',
  'ai-recipe-optimizer',
  'activity-feed-timeline',
  'role-based-access-control',
  'tenant-isolation-audit',
  'prep-task-dependency-graph',
  'kitchen-ops-rules-engine',
  'entity-relationship-graph',
  'ai-context-aware-suggestions',
  'recipe-scaling-engine',
  'manifest-policy-editor',
  'ai-natural-language-commands'
];

// Search locations
const searchLocations = {
  api: 'apps/api/app/api',
  ui: 'apps/app/app/(authenticated)',
  manifest: 'packages/manifest-adapters',
  tests: 'apps/api/__tests__'
};

let results = [];

features.forEach(feature => {
  let result = {
    feature: feature,
    status: 'missing',
    api_files: [],
    ui_files: [],
    manifest_files: [],
    test_files: [],
    notes: ''
  };

  // Check API files
  try {
    const apiFiles = fs.readdirSync(searchLocations.api, { recursive: true });
    const matchingApiFiles = apiFiles.filter(file => 
      typeof file === 'string' && 
      (file.toLowerCase().includes(feature.replace(/-/g, '-')) || 
       file.toLowerCase().includes(feature.replace(/-/g, '_')))
    );
    if (matchingApiFiles.length > 0) {
      result.api_files = matchingApiFiles.map(f => path.join(searchLocations.api, f));
      result.status = result.status === 'missing' ? 'partial' : 'survived';
    }
  } catch (e) {}

  // Check UI files
  try {
    const uiFiles = fs.readdirSync(searchLocations.ui, { recursive: true });
    const matchingUiFiles = uiFiles.filter(file => 
      typeof file === 'string' && 
      (file.toLowerCase().includes(feature.replace(/-/g, '-')) || 
       file.toLowerCase().includes(feature.replace(/-/g, '_')))
    );
    if (matchingUiFiles.length > 0) {
      result.ui_files = matchingUiFiles.map(f => path.join(searchLocations.ui, f));
      result.status = result.status === 'missing' ? 'partial' : 'survived';
    }
  } catch (e) {}

  // Check manifest files
  try {
    const manifestFiles = fs.readdirSync(searchLocations.manifest, { recursive: true });
    const matchingManifestFiles = manifestFiles.filter(file => 
      typeof file === 'string' && 
      (file.toLowerCase().includes(feature.replace(/-/g, '-')) || 
       file.toLowerCase().includes(feature.replace(/-/g, '_')))
    );
    if (matchingManifestFiles.length > 0) {
      result.manifest_files = matchingManifestFiles.map(f => path.join(searchLocations.manifest, f));
      result.status = result.status === 'missing' ? 'partial' : 'survived';
    }
  } catch (e) {}

  // Check test files
  try {
    const testFiles = fs.readdirSync(searchLocations.tests, { recursive: true });
    const matchingTestFiles = testFiles.filter(file => 
      typeof file === 'string' && 
      (file.toLowerCase().includes(feature.replace(/-/g, '-')) || 
       file.toLowerCase().includes(feature.replace(/-/g, '_')))
    );
    if (matchingTestFiles.length > 0) {
      result.test_files = matchingTestFiles.map(f => path.join(searchLocations.tests, f));
      result.status = result.status === 'missing' ? 'partial' : 'survived';
    }
  } catch (e) {}

  results.push(result);
});

console.log(JSON.stringify(results, null, 2));
