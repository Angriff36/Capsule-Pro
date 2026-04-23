#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const PROJECTS_DIR = '/home/oc/src/openclaw/projects';
const results = [];
try {
  const entries = fs.readdirSync(PROJECTS_DIR, {withFileTypes: true});
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const taskFile = path.join(PROJECTS_DIR, e.name, '.autolab', 'tasks.json');
    if (!fs.existsSync(taskFile)))) continue;
    const tasks = JSON.parse(fs.readFileSync(taskFile,'utf8'));
    const ready = tasks.filter(t => t.status === 'ready');
    if (ready.length) results.push({project: e.name, count: ready.length, tasks: ready.map(t => ({id: t.id, title: (t.title||'').slice(0,80)}))});
  }
} catch(err) { console.error(err.message); }
console.log(JSON.stringify(results, null, 2));
