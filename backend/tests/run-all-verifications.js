/**
 * Master Verification Suite Runner
 * Executes all 13 point-by-point verification suites across the Dairy Suite platform.
 */

import { spawn } from 'child_process';
import path from 'path';

const suites = [
  { id: 'Item 1', name: 'Secure Login & RBAC Auth', file: 'verify-item1-secure-login.js' },
  { id: 'Item 2', name: 'Asset Registry & Health Dashboard', file: 'verify-item2-asset-registry.js' },
  { id: 'Item 3', name: 'Asset Detail & Maintenance History', file: 'verify-item3-asset-detail.js' },
  { id: 'Item 4', name: 'Maintenance Calendar & Technician Queue', file: 'verify-item4-calendar-queue.js' },
  { id: 'Item 5', name: 'Maintenance Planning & Closure Verification', file: 'verify-item5-maintenance-planning.js' },
  { id: 'Item 6', name: 'Failure Risk & Remaining Useful Life', file: 'verify-item6-failure-risk-rul.js' },
  { id: 'Item 7', name: 'Maintenance Recommendations (HITL)', file: 'verify-item7-maintenance-recommendations.js' },
  { id: 'Item 8', name: 'Reliability & Model Performance Tracking', file: 'verify-item8-reliability-model-performance.js' },
  { id: 'Item 9', name: 'Reports & Analytics Multi-Period', file: 'verify-item9-reports-analytics.js' },
  { id: 'Item 10', name: 'Notifications & In-App Alerts Panel', file: 'verify-item10-notifications.js' },
  { id: 'Item 11', name: 'User & Role Management (Least-Privilege)', file: 'verify-item11-user-roles.js' },
  { id: 'Item 12', name: 'Audit Logs & System Configuration', file: 'verify-item12-audit-settings.js' },
  { id: 'Item 13', name: 'Cross-Cutting Requirements & Security', file: 'verify-item13-cross-cutting-requirements.js' }
];

async function runChild(scriptName) {
  return new Promise((resolve, reject) => {
    const fullPath = path.resolve('backend/tests', scriptName);
    const proc = spawn('node', [fullPath], { stdio: 'inherit' });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Test script ${scriptName} exited with code ${code}`));
    });
  });
}

async function main() {
  const startTime = Date.now();
  console.log('\n========================================================================');
  console.log(' MASTER SUITE: EXECUTING ALL 13 VERIFICATION SUITES SEQUENTIALLY');
  console.log('========================================================================\n');

  for (let i = 0; i < suites.length; i++) {
    const s = suites[i];
    console.log(`\n>>> [${i + 1}/${suites.length}] Running ${s.id}: ${s.name} (${s.file})...`);
    await runChild(s.file);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n========================================================================');
  console.log(` ALL 13 VERIFICATION SUITES COMPLETED SUCCESSFULLY IN ${durationSec}s`);
  console.log(' 100% OF VERIFICATION CHECKS PASSED WITH ZERO FAULTS');
  console.log('========================================================================\n');
}

main().catch((err) => {
  console.error('\n*** MASTER RUNNER FAILED ***\n', err);
  process.exit(1);
});

