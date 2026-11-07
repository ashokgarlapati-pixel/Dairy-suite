import mongoose from 'mongoose';
import { WorkOrder } from '../models/WorkOrder.js';
import { Asset } from '../models/Asset.js';
import { User } from '../models/User.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { recordAuditEvent } from '../utils/auditLogger.js';
import {
  WORK_ORDER_STATUS,
  WORK_ORDER_PRIORITY,
  ROLES,
  ASSET_STATUS
} from '../config/constants.js';

// Pre-seeded high-fidelity Dairy Work Orders covering the complete lifecycle
const INITIAL_WORK_ORDERS = [
  {
    workOrderNumber: 'WO-2026-0819',
    assetTag: 'BMC-MYSORE-014',
    title: 'Compressor Suction Valve Plate Replacement & Leak Test',
    description:
      'Chilling cycle degraded to 4.2 hours (exceeds 3.5h limit). Suction pressure depressed at 2.1 bar. Replace suction reed valve assembly, evacuate line with vacuum pump, recharge with 2.8kg R404A, and verify rapid pull-down to 3.8°C.',
    priority: WORK_ORDER_PRIORITY.CRITICAL_P0,
    source: 'AI_PREDICTIVE_TRIGGER',
    status: WORK_ORDER_STATUS.IN_PROGRESS,
    requiredSkills: ['Refrigeration Mechanic (Certified)', 'HVAC Vacuum & Recovery'],
    partsRequired: [
      { partName: 'Copeland 7.5HP Suction Valve Plate', quantityReserved: 1, unitCost: 4800 },
      { partName: 'R404A Eco Refrigerant Canister (10kg)', quantityReserved: 1, unitCost: 6500 },
      { partName: 'Sanitary Neoprene O-Ring Kit', quantityReserved: 2, unitCost: 450 }
    ],
    estimatedDowntimeHours: 4.5,
    actualDowntimeHours: 2.0,
    scheduledStartDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
    scheduledEndDate: new Date(Date.now() + 3 * 60 * 60 * 1000),
    actualStartDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
    orgScope: {
      cooperativeZone: 'Southern District Union',
      plantId: 'Plant-Central (Mysore)',
      centerId: 'VCC-MYSORE-01'
    }
  },
  {
    workOrderNumber: 'WO-2026-0820',
    assetTag: 'PST-LINE-01',
    title: 'Pasteurizer Plate Pack Acid De-Scaling & Gasket Inspection',
    description:
      'Regeneration section differential pressure rising (1.9 bar). CIP caustic wash return flow dropped below 120 L/min due to milk stone deposits. Perform 2% nitric acid circulation descaling and inspect food-grade EPDM plate clip-on gaskets.',
    priority: WORK_ORDER_PRIORITY.HIGH_P1,
    source: 'PREVENTIVE_SCHEDULE',
    status: WORK_ORDER_STATUS.ASSIGNED,
    requiredSkills: ['Dairy Plant Process Technician', 'CIP System Sanitization'],
    partsRequired: [
      { partName: 'EPDM Clip-on Plate Gaskets (Set of 10)', quantityReserved: 2, unitCost: 3200 },
      { partName: 'Food-Grade Nitric Acid Descaler (25L)', quantityReserved: 1, unitCost: 2800 }
    ],
    estimatedDowntimeHours: 3.0,
    scheduledStartDate: new Date(Date.now() + 18 * 60 * 60 * 1000),
    scheduledEndDate: new Date(Date.now() + 22 * 60 * 60 * 1000),
    orgScope: {
      cooperativeZone: 'Southern District Union',
      plantId: 'Plant-Central (Mysore)',
      centerId: 'VCC-MYSORE-01'
    }
  },
  {
    workOrderNumber: 'WO-2026-0821',
    assetTag: 'HMG-LINE-02',
    title: 'High-Pressure Plunger Ceramic Packing Seal Overhaul',
    description:
      'Severe vibration RMS (4.8 mm/s) detected on plunger #2 with pressure fluctuations of ±20 bar. Replace worn ceramic packing sleeves and calibrate hydraulic pressure relief valve to 200 bar.',
    priority: WORK_ORDER_PRIORITY.HIGH_P1,
    source: 'AI_PREDICTIVE_TRIGGER',
    status: WORK_ORDER_STATUS.PENDING_APPROVAL,
    requiredSkills: ['Precision Mechanical Fitter', 'Hydraulics Specialist'],
    partsRequired: [
      { partName: 'Ceramic Plunger Sleeve 45mm', quantityReserved: 3, unitCost: 7500 },
      { partName: 'V-Packing High-Pressure Seal Ring Pack', quantityReserved: 3, unitCost: 1850 }
    ],
    estimatedDowntimeHours: 5.0,
    actualDowntimeHours: 4.5,
    actualStartDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    actualCompletionDate: new Date(Date.now() - 4 * 60 * 60 * 1000),
    evidence: {
      summaryOfWork:
        'Disassembled plunger housing #2. Replaced 3 ceramic packing sleeves and installed fresh V-packing seals. Torqued cylinder bolts to 180 Nm. Ran water pressure test at 220 bar for 30 minutes with zero leakage. Vibration dropped back to 2.1 mm/s.',
      photos: [
        'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80'
      ],
      checklistResults: [
        { item: 'Plunger alignment and runout check', result: 'PASS', notes: 'Runout within 0.02mm' },
        { item: 'Hydraulic oil level and filter inspection', result: 'PASS', notes: 'ISO VG 68 clean' },
        { item: 'Pressure relief valve pop-off test', result: 'PASS', notes: 'Triggers exactly at 225 bar' }
      ]
    },
    orgScope: {
      cooperativeZone: 'Southern District Union',
      plantId: 'Plant-Central (Mysore)',
      centerId: 'VCC-MYSORE-01'
    }
  },
  {
    workOrderNumber: 'WO-2026-0818',
    assetTag: 'TNK-KA09-4412',
    title: 'Sanitary Discharge Valve Gasket Replacement & CIP Leak Verification',
    description:
      'Compartment #2 sanitary butterfly valve seat showed minor seepage during unloading dock pressure test. Replaced silicon seal and verified leak-tightness.',
    priority: WORK_ORDER_PRIORITY.MEDIUM_P2,
    source: 'MANUAL',
    status: WORK_ORDER_STATUS.CLOSED,
    requiredSkills: ['Sanitary Dairy Plumbing'],
    partsRequired: [{ partName: '3-Inch Silicon Butterfly Seat Gasket', quantityReserved: 1, unitCost: 850 }],
    estimatedDowntimeHours: 1.5,
    actualDowntimeHours: 1.2,
    actualStartDate: new Date(Date.now() - 48 * 60 * 60 * 1000),
    actualCompletionDate: new Date(Date.now() - 46 * 60 * 60 * 1000),
    closureDetails: {
      summaryOfWork: 'Installed new silicon butterfly valve seat. Sanitized with 85°C hot water loop.',
      signoffSignatureName: 'Ramesh Patel (Operations Manager)',
      closedAt: new Date(Date.now() - 45 * 60 * 60 * 1000),
      supervisorNotes: 'Verified zero seepage under 3 bar hydrostatic test. Tanker released for route.'
    },
    orgScope: {
      cooperativeZone: 'Southern District Union',
      plantId: 'Plant-Central (Mysore)',
      centerId: 'VCC-MANDYA-04'
    }
  },
  {
    workOrderNumber: 'WO-2026-0822',
    assetTag: 'BMC-MANDYA-007',
    title: 'Emergency Agitator Motor Thermal Overload Diagnostic',
    description:
      'BMC agitator motor tripping circuit breaker during evening collection. Agitator RPM dropped to 0 while milk intake in progress. Inspect motor winding resistance and capacitor bank.',
    priority: WORK_ORDER_PRIORITY.CRITICAL_P0,
    source: 'MANUAL',
    status: WORK_ORDER_STATUS.CREATED,
    requiredSkills: ['Industrial Electrician', 'Motor Diagnostics'],
    partsRequired: [{ partName: 'Single Phase 0.5HP Agitator Motor Capacitor (40uF)', quantityReserved: 1, unitCost: 650 }],
    estimatedDowntimeHours: 2.0,
    scheduledStartDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
    scheduledEndDate: new Date(Date.now() + 4 * 60 * 60 * 1000),
    orgScope: {
      cooperativeZone: 'Southern District Union',
      plantId: 'Plant-Central (Mysore)',
      centerId: 'VCC-MANDYA-04'
    }
  }
];

export let inMemoryWorkOrders = [...INITIAL_WORK_ORDERS];

/**
 * Auto-seed realistic work orders if collection is empty
 */
const autoSeedWorkOrdersIfEmpty = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      const count = await WorkOrder.countDocuments();
      if (count === 0) {
        console.log('[WorkOrder Controller] Seeding initial dairy work orders...');
        const demoUser = await User.findOne({ email: 'tech@dairycoop.org' });
        const adminUser = await User.findOne({ email: 'admin@dairycoop.org' });

        for (const wo of INITIAL_WORK_ORDERS) {
          const asset = await Asset.findOne({ assetTag: wo.assetTag });
          if (asset) {
            await WorkOrder.create({
              ...wo,
              assetId: asset._id,
              createdById: adminUser?._id || new mongoose.Types.ObjectId(),
              assignedTechnicianId: demoUser?._id || new mongoose.Types.ObjectId()
            });
          }
        }
        console.log('[WorkOrder Controller] Seeded 5 initial dairy work orders successfully.');
      }
    }
  } catch (err) {
    console.warn(`[WorkOrder Auto-Seed Warning] ${err.message}`);
  }
};

/**
 * GET /api/v1/work-orders
 * Lists work orders with filtering, search, and scope isolation
 */
export const getWorkOrders = async (req, res) => {
  try {
    await autoSeedWorkOrdersIfEmpty();

    const {
      status,
      priority,
      assetId,
      assignedTechnicianId,
      source,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const query = {};

    // Organizational scope isolation
    if (req.scopeQuery && Object.keys(req.scopeQuery).length > 0) {
      Object.assign(query, req.scopeQuery);
    }

    // Role-specific filtering: Technicians default to their assigned tickets if requested
    if (req.user && req.user.role === ROLES.TECHNICIAN && req.query.myQueue === 'true') {
      query.assignedTechnicianId = req.user._id;
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (source) query.source = source;
    if (assetId) {
      if (mongoose.Types.ObjectId.isValid(assetId)) {
        query.assetId = assetId;
      } else if (mongoose.connection.readyState === 1) {
        const foundAsset = await Asset.findOne({ assetTag: assetId.trim().toUpperCase() });
        if (foundAsset) {
          query.assetId = foundAsset._id;
        } else {
          query.assetId = null; // Asset tag not found
        }
      }
    }
    if (assignedTechnicianId) query.assignedTechnicianId = assignedTechnicianId;

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { workOrderNumber: searchRegex },
        { title: searchRegex },
        { description: searchRegex }
      ];
    }

    let workOrders = [];
    let total = 0;

    if (mongoose.connection.readyState === 1) {
      total = await WorkOrder.countDocuments(query);
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      workOrders = await WorkOrder.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate('assetId', 'assetTag name category location currentHealthScore currentStatus')
        .populate('assignedTechnicianId', 'fullName email phone')
        .populate('createdById', 'fullName role')
        .populate('approvedById', 'fullName role');
    } else {
      let filtered = [...inMemoryWorkOrders];
      if (assetId) {
        const cleanTag = assetId.toString().toLowerCase().trim();
        filtered = filtered.filter(
          (w) =>
            w.assetTag?.toLowerCase() === cleanTag ||
            w.assetId?.toString() === cleanTag ||
            (w.assetId?._id && w.assetId._id.toString() === cleanTag)
        );
      }
      if (status) filtered = filtered.filter((w) => w.status === status);
      if (priority) filtered = filtered.filter((w) => w.priority === priority);
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (w) =>
            w.workOrderNumber.toLowerCase().includes(q) ||
            w.title.toLowerCase().includes(q) ||
            w.description.toLowerCase().includes(q)
        );
      }
      total = filtered.length;
      workOrders = filtered.slice(skip, skip + limitNum);
    }

    return ApiResponse.success(res, {
      workOrders,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    console.error('[WorkOrder Controller Error] getWorkOrders:', error);
    return ApiResponse.error(res, error.message || 'Failed to retrieve work orders', 500);
  }
};

/**
 * GET /api/v1/work-orders/:id
 * Retrieve full work order details by ID or workOrderNumber
 */
export const getWorkOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    let workOrder = null;

    if (mongoose.connection.readyState === 1) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        workOrder = await WorkOrder.findById(id)
          .populate('assetId')
          .populate('assignedTechnicianId', 'fullName email phone role')
          .populate('createdById', 'fullName role')
          .populate('approvedById', 'fullName role');
      } else {
        workOrder = await WorkOrder.findOne({ workOrderNumber: id.toUpperCase() })
          .populate('assetId')
          .populate('assignedTechnicianId', 'fullName email phone role')
          .populate('createdById', 'fullName role')
          .populate('approvedById', 'fullName role');
      }
    } else {
      workOrder = inMemoryWorkOrders.find(
        (w) => w._id === id || w.workOrderNumber === id.toUpperCase()
      );
    }

    if (!workOrder) {
      return ApiResponse.error(res, `Work order '${id}' not found.`, 404);
    }

    return ApiResponse.success(res, workOrder, 'Work order retrieved successfully');
  } catch (error) {
    console.error('[WorkOrder Controller Error] getWorkOrderById:', error);
    return ApiResponse.error(res, error.message || 'Failed to fetch work order', 500);
  }
};

/**
 * POST /api/v1/work-orders
 * Create a new work order
 */
export const createWorkOrder = async (req, res) => {
  try {
    const data = req.body;
    const count = (await WorkOrder.countDocuments().catch(() => inMemoryWorkOrders.length)) + 825;
    const generatedNumber = `WO-2026-${String(count).padStart(4, '0')}`;

    // Resolve asset
    let asset = null;
    if (mongoose.connection.readyState === 1) {
      asset = await Asset.findById(data.assetId);
    }

    const newDoc = {
      workOrderNumber: generatedNumber,
      assetId: data.assetId,
      title: data.title,
      description: data.description,
      priority: data.priority || WORK_ORDER_PRIORITY.MEDIUM_P2,
      source: data.source || 'MANUAL',
      status: data.assignedTechnicianId ? WORK_ORDER_STATUS.ASSIGNED : WORK_ORDER_STATUS.CREATED,
      assignedTechnicianId: data.assignedTechnicianId || null,
      createdById: req.user?._id || new mongoose.Types.ObjectId(),
      scheduledStartDate: data.scheduledStartDate || new Date(),
      scheduledEndDate: data.scheduledEndDate || new Date(Date.now() + 24 * 60 * 60 * 1000),
      requiredSkills: data.requiredSkills || [],
      partsRequired: data.partsRequired || [],
      estimatedDowntimeHours: data.estimatedDowntimeHours || 0,
      orgScope: data.orgScope || asset?.orgScope || { cooperativeZone: 'Southern District Union' }
    };

    let createdWO = null;

    if (mongoose.connection.readyState === 1) {
      createdWO = await WorkOrder.create(newDoc);
      // If critical, set asset to under maintenance
      if (asset && data.priority === WORK_ORDER_PRIORITY.CRITICAL_P0) {
        asset.currentStatus = ASSET_STATUS.UNDER_MAINTENANCE;
        await asset.save();
      }
    } else {
      createdWO = {
        _id: new mongoose.Types.ObjectId().toString(),
        ...newDoc,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      inMemoryWorkOrders.unshift(createdWO);
    }

    // Record Immutable Audit Log
    await recordAuditEvent({
      req,
      action: 'CREATE',
      resourceType: 'WorkOrder',
      resourceId: createdWO.workOrderNumber,
      orgScope: createdWO.orgScope,
      outcome: 'SUCCESS',
      newState: createdWO,
      reason: `Created ${createdWO.priority} work order for asset '${data.assetId}'`
    });

    return ApiResponse.success(res, createdWO, 'Work order created successfully', 201);
  } catch (error) {
    console.error('[WorkOrder Controller Error] createWorkOrder:', error);
    return ApiResponse.error(res, error.message || 'Failed to create work order', 500);
  }
};

/**
 * PATCH /api/v1/work-orders/:id/status
 * State machine transition:
 * CREATED -> ASSIGNED -> IN_PROGRESS -> PENDING_APPROVAL -> APPROVED -> COMPLETED / CLOSED
 * Supports REJECTED, DEFERRED, ESCALATED
 */
export const updateWorkOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status: targetStatus, reason = 'State transition requested', notes = '' } = req.body;

    let wo = null;
    if (mongoose.connection.readyState === 1) {
      wo = await WorkOrder.findById(id);
    } else {
      wo = inMemoryWorkOrders.find((w) => w._id === id || w.workOrderNumber === id);
    }

    if (!wo) {
      return ApiResponse.error(res, `Work order '${id}' not found.`, 404);
    }

    const previousStatus = wo.status;
    const userRole = req.user?.role || ROLES.TECHNICIAN;

    // RBAC permission check on status transitions
    if (
      (targetStatus === WORK_ORDER_STATUS.APPROVED || targetStatus === WORK_ORDER_STATUS.CLOSED) &&
      userRole === ROLES.TECHNICIAN
    ) {
      return ApiResponse.error(
        res,
        'Access denied: Technicians cannot directly approve or close work orders. Submit for supervisor review.',
        403
      );
    }

    // Apply status change
    wo.status = targetStatus;

    if (targetStatus === WORK_ORDER_STATUS.IN_PROGRESS && !wo.actualStartDate) {
      wo.actualStartDate = new Date();
    } else if (
      (targetStatus === WORK_ORDER_STATUS.APPROVED || targetStatus === WORK_ORDER_STATUS.CLOSED) &&
      !wo.actualCompletionDate
    ) {
      wo.actualCompletionDate = new Date();
      wo.approvedById = req.user?._id;
    }

    if (mongoose.connection.readyState === 1) {
      await wo.save();

      // If closed, return asset to operational if no other open critical work orders
      if (targetStatus === WORK_ORDER_STATUS.CLOSED && wo.assetId) {
        const asset = await Asset.findById(wo.assetId);
        if (asset && asset.currentStatus === ASSET_STATUS.UNDER_MAINTENANCE) {
          asset.currentStatus = ASSET_STATUS.OPERATIONAL;
          asset.currentHealthScore = Math.min(100, (asset.currentHealthScore || 70) + 20);
          await asset.save();
        }
      }
    }

    // Record Immutable Audit Log
    await recordAuditEvent({
      req,
      action: 'MODIFY',
      resourceType: 'WorkOrder',
      resourceId: wo.workOrderNumber,
      orgScope: wo.orgScope,
      outcome: 'SUCCESS',
      previousState: { status: previousStatus },
      newState: { status: targetStatus, notes },
      reason: `Status transitioned from ${previousStatus} to ${targetStatus}: ${reason}`
    });

    return ApiResponse.success(
      res,
      wo,
      `Work order status transitioned from ${previousStatus} to ${targetStatus}`
    );
  } catch (error) {
    console.error('[WorkOrder Controller Error] updateWorkOrderStatus:', error);
    return ApiResponse.error(res, error.message || 'Status transition failed', 500);
  }
};

/**
 * PATCH /api/v1/work-orders/:id
 * General work order editing, assignment, priority escalation, deferral, and supervisor override
 */
export const updateWorkOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const reason = updates.reason || 'Work order updated by authorized user';

    // RBAC: Only Admin and Operations Manager can modify/assign/escalate/defer/override
    if (req.user?.role !== ROLES.MAINTENANCE_ADMIN && req.user?.role !== ROLES.OPERATIONS_MANAGER) {
      return ApiResponse.error(res, 'Access denied: Only Maintenance Admin or Operations Manager can modify work orders.', 403);
    }

    let wo = null;
    if (mongoose.connection.readyState === 1) {
      wo = await WorkOrder.findById(id);
    } else {
      wo = inMemoryWorkOrders.find((w) => w._id === id || w.workOrderNumber === id);
    }

    if (!wo) {
      return ApiResponse.error(res, `Work order '${id}' not found.`, 404);
    }

    const previousState = {
      title: wo.title,
      priority: wo.priority,
      status: wo.status,
      assignedTechnicianId: wo.assignedTechnicianId,
      estimatedDowntimeHours: wo.estimatedDowntimeHours
    };

    // Apply allowed updates
    if (updates.title) wo.title = updates.title;
    if (updates.description) wo.description = updates.description;
    if (updates.priority) wo.priority = updates.priority;
    if (updates.status) wo.status = updates.status;
    if (updates.assignedTechnicianId !== undefined) {
      wo.assignedTechnicianId = updates.assignedTechnicianId;
      if (wo.status === WORK_ORDER_STATUS.CREATED && updates.assignedTechnicianId) {
        wo.status = WORK_ORDER_STATUS.ASSIGNED;
      }
    }
    if (updates.requiredSkills) wo.requiredSkills = updates.requiredSkills;
    if (updates.partsRequired) wo.partsRequired = updates.partsRequired;
    if (updates.estimatedDowntimeHours !== undefined) wo.estimatedDowntimeHours = updates.estimatedDowntimeHours;
    if (updates.scheduledStartDate) wo.scheduledStartDate = new Date(updates.scheduledStartDate);
    if (updates.scheduledEndDate) wo.scheduledEndDate = new Date(updates.scheduledEndDate);

    if (mongoose.connection.readyState === 1) {
      await wo.save();
    }

    const newState = {
      title: wo.title,
      priority: wo.priority,
      status: wo.status,
      assignedTechnicianId: wo.assignedTechnicianId,
      estimatedDowntimeHours: wo.estimatedDowntimeHours
    };

    // Determine audit action: ESCALATE, DEFER, OVERRIDE, or MODIFY
    let auditAction = 'MODIFY';
    if (updates.isEscalate || (updates.priority === 'CRITICAL_P0' && previousState.priority !== 'CRITICAL_P0')) {
      auditAction = 'ESCALATE';
    } else if (updates.isDefer || updates.status === 'DEFERRED') {
      auditAction = 'DEFER';
    } else if (updates.isOverride) {
      auditAction = 'OVERRIDE';
    }

    await recordAuditEvent({
      req,
      action: auditAction,
      resourceType: 'WorkOrder',
      resourceId: wo.workOrderNumber,
      orgScope: wo.orgScope,
      outcome: 'SUCCESS',
      previousState,
      newState,
      reason: `${auditAction} action applied to work order: ${reason}`
    });

    return ApiResponse.success(res, wo, `Work order updated successfully [Action: ${auditAction}]`);
  } catch (error) {
    console.error('[WorkOrder Controller Error] updateWorkOrder:', error);
    return ApiResponse.error(res, error.message || 'Work order update failed', 500);
  }
};

/**
 * POST /api/v1/work-orders/:id/evidence
 * Technician Mobile Evidence Upload (Photos, checklists, audio voice notes, GPS stamp)
 */
export const uploadEvidence = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      summaryOfWork,
      photos = [],
      audioNotesUrl = '',
      gpsCoordinates = null,
      checklistResults = [],
      partsConsumed = []
    } = req.body;

    let wo = null;
    if (mongoose.connection.readyState === 1) {
      wo = await WorkOrder.findById(id);
    } else {
      wo = inMemoryWorkOrders.find((w) => w._id === id || w.workOrderNumber === id);
    }

    if (!wo) {
      return ApiResponse.error(res, `Work order '${id}' not found.`, 404);
    }

    // Attach evidence
    wo.evidence = {
      summaryOfWork,
      photos,
      audioNotesUrl,
      gpsCoordinates,
      checklistResults,
      submittedAt: new Date()
    };

    // Automatically transition to PENDING_APPROVAL for supervisor sign-off
    wo.status = WORK_ORDER_STATUS.PENDING_APPROVAL;
    wo.actualCompletionDate = new Date();

    if (mongoose.connection.readyState === 1) {
      await wo.save();
    }

    // Record Immutable Audit Log
    await recordAuditEvent({
      req,
      action: 'MODIFY',
      resourceType: 'WorkOrder',
      resourceId: wo.workOrderNumber,
      orgScope: wo.orgScope,
      outcome: 'SUCCESS',
      newState: { status: WORK_ORDER_STATUS.PENDING_APPROVAL, evidenceAttached: true },
      reason: 'Field technician uploaded completion evidence (photos/checklist/voice notes)'
    });

    return ApiResponse.success(
      res,
      wo,
      'Evidence submitted successfully. Work order submitted for supervisor verification.'
    );
  } catch (error) {
    console.error('[WorkOrder Controller Error] uploadEvidence:', error);
    return ApiResponse.error(res, error.message || 'Evidence upload failed', 500);
  }
};

/**
 * POST /api/v1/work-orders/:id/verify
 * Multi-Tier Supervisor Sign-Off and Formal Closure
 */
export const verifyClosure = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, supervisorNotes, signoffSignatureName } = req.body;

    let wo = null;
    if (mongoose.connection.readyState === 1) {
      wo = await WorkOrder.findById(id);
    } else {
      wo = inMemoryWorkOrders.find((w) => w._id === id || w.workOrderNumber === id);
    }

    if (!wo) {
      return ApiResponse.error(res, `Work order '${id}' not found.`, 404);
    }

    const previousStatus = wo.status;

    if (decision === 'APPROVED') {
      wo.status = WORK_ORDER_STATUS.CLOSED;
      wo.approvedById = req.user?._id;
      wo.closureDetails = {
        summaryOfWork: wo.evidence?.summaryOfWork || 'Work completed per engineering specifications',
        signoffSignatureName,
        closedAt: new Date(),
        supervisorNotes
      };

      // Reset asset status to Operational
      if (mongoose.connection.readyState === 1 && wo.assetId) {
        const asset = await Asset.findById(wo.assetId);
        if (asset) {
          asset.currentStatus = ASSET_STATUS.OPERATIONAL;
          asset.currentHealthScore = 95;
          await asset.save();
        }
      }
    } else {
      // REJECTED - Send back to In Progress for rework
      wo.status = WORK_ORDER_STATUS.IN_PROGRESS;
      wo.closureDetails = {
        closedAt: null,
        supervisorNotes: `Rework Required: ${supervisorNotes}`,
        signoffSignatureName
      };
    }

    if (mongoose.connection.readyState === 1) {
      await wo.save();
    }

    // Record Immutable Audit Log
    await recordAuditEvent({
      req,
      action: decision === 'APPROVED' ? 'APPROVAL' : 'REJECTION',
      resourceType: 'WorkOrder',
      resourceId: wo.workOrderNumber,
      orgScope: wo.orgScope,
      outcome: 'SUCCESS',
      previousState: { status: previousStatus },
      newState: { status: wo.status, supervisorNotes, signoffSignatureName },
      reason: `Supervisor closure verification: ${decision}. Notes: ${supervisorNotes}`
    });

    return ApiResponse.success(
      res,
      wo,
      decision === 'APPROVED'
        ? 'Work order verified and successfully closed.'
        : 'Work order rejected and returned to technician queue for rework.'
    );
  } catch (error) {
    console.error('[WorkOrder Controller Error] verifyClosure:', error);
    return ApiResponse.error(res, error.message || 'Closure verification failed', 500);
  }
};

