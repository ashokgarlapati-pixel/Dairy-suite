import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { ROLES } from '../config/constants.js';

export const seedUsers = async () => {
  console.log('[Seeder] Starting Dairy Cooperative Users Seeding...');
  await connectDB();

  const salt = await bcrypt.genSalt(12);

  const demoUsers = [
    {
      fullName: 'Garlapati Ashok babu (Lead Admin)',
      email: 'admin@dairycoop.org',
      passwordHash: await bcrypt.hash('Admin@123', salt),
      role: ROLES.MAINTENANCE_ADMIN,
      phone: '+91 98450 11001',
      orgScope: {
        cooperativeZone: 'ALL',
        assignedPlants: ['Plant-Central (Mysore)', 'Plant-North (Hassan)'],
        assignedCenters: ['VCC-MYSORE-01', 'VCC-MANDYA-04', 'VCC-HASSAN-02']
      },
      accountStatus: 'ACTIVE'
    },
    {
      fullName: 'Ramesh Patel (Operations Manager)',
      email: 'ops@dairycoop.org',
      passwordHash: await bcrypt.hash('Ops@123', salt),
      role: ROLES.OPERATIONS_MANAGER,
      phone: '+91 98450 22002',
      orgScope: {
        cooperativeZone: 'Southern District Union',
        assignedPlants: ['Plant-Central (Mysore)'],
        assignedCenters: ['VCC-MYSORE-01', 'VCC-MANDYA-04']
      },
      accountStatus: 'ACTIVE'
    },
    {
      fullName: 'Suresh Kumar (Senior Field Technician)',
      email: 'tech@dairycoop.org',
      passwordHash: await bcrypt.hash('Tech@123', salt),
      role: ROLES.TECHNICIAN,
      phone: '+91 98450 33003',
      orgScope: {
        cooperativeZone: 'Southern District Union',
        assignedPlants: ['Plant-Central (Mysore)'],
        assignedCenters: ['VCC-MYSORE-01']
      },
      accountStatus: 'ACTIVE'
    },
    {
      fullName: 'CoolTech Industrial Chillers (Authorized Vendor)',
      email: 'vendor@cooltech.com',
      passwordHash: await bcrypt.hash('Vendor@123', salt),
      role: ROLES.VENDOR,
      phone: '+91 98450 44004',
      orgScope: {
        cooperativeZone: 'Southern District Union',
        assignedPlants: ['Plant-Central (Mysore)'],
        assignedCenters: []
      },
      accountStatus: 'ACTIVE'
    }
  ];

  for (const u of demoUsers) {
    const existing = await User.findOne({ email: u.email });
    if (!existing) {
      const created = await User.create(u);
      console.log(`[Seeder] Created demo user: ${created.email} [${created.role}]`);

      // Log initial seed event in AuditLog
      try {
        await AuditLog.create({
          actorId: created._id,
          actorName: created.fullName,
          actorRole: created.role,
          action: 'CREATE',
          resourceType: 'User',
          resourceId: created.email,
          orgScope: created.orgScope,
          outcome: 'SUCCESS',
          reason: 'Initial system provisioning of cooperative user',
          timestamp: new Date()
        });
      } catch (e) {
        // Ignore audit hooks during seeding if needed
      }
    } else {
      console.log(`[Seeder] User already exists: ${u.email} [${u.role}]`);
    }
  }

  console.log('[Seeder] User seeding completed successfully.');
  process.exit(0);
};

// Auto-execute when run as script
seedUsers().catch((err) => {
  console.error('[Seeder Error]', err);
  process.exit(1);
});
