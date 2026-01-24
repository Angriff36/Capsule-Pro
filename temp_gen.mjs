const fs = require('fs');
const idRouteTs = 'import type {Shipment} from "../types";';
fs.writeFileSync('apps/api/app/api/shipments/[id]/route.ts', idRouteTs);
console.log('Created [id]/route.ts');
