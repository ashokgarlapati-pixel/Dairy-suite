# System Design & Master Implementation Plan
## AI-Powered Smart Asset Reliability & Maintenance Suite
**Target Industry:** Dairy Cooperative Supply Chain (Milk Collection, Testing, Bulk Milk Cooling, Chilling, Transport, Processing, Packaging, Distribution & Farmer Support)  
**Lead Author / Prepared By:** Garlapati Ashok babu  
**Target Tech Stack:** React.js, Vite, Tailwind CSS, Node.js, Express.js, MongoDB (Mongoose), Google Gemini API  
**Target Cloud Deployment:** Vercel (Frontend), Render (Backend), MongoDB Atlas  

---

## 1. Executive Summary & Objective

### 1.1 Industry Background & Operational Challenge
In a dairy cooperative supply chain, raw milk is an exceptionally perishable biological commodity. Milk quality deteriorates exponentially once extracted unless rapidly chilled to **$\le 4^\circ\text{C}$ within 2 to 4 hours**.
The supply chain spans thousands of smallholder village farmers, Village Collection Centres (VCCs), Bulk Milk Coolers (BMCs), insulated road milk tankers, central dairy processing plants (pasteurizers, homogenizers, separators, packaging lines, cold storage), and retail distribution fleets.

Traditional dairy maintenance is predominantly reactive:
- **Catastrophic Cold-Chain Breakdowns:** Compressor failure on a 5,000-liter BMC causes bacterial proliferation, curdling, and total batch rejection.
- **Processing Plant Interruptions:** Plate fouling in a pasteurizer or Clean-in-Place (CIP) flow drop forces plant-wide shutdowns.
- **Socio-Economic Ripple Effect:** Spoiled milk leads to direct financial losses for cooperative farmers, delays in periodic settlement payments, and food safety compliance violations.

### 1.2 System Vision & Governance
This suite provides a comprehensive, end-to-end reliability and maintenance ecosystem that transitions the cooperative from reactive firefighting to **predictive and prescriptive reliability**.
- **Complete Lifecycle Management:** From telemetry ingestion, condition monitoring, and AI failure risk forecasting to technician job queue dispatch, mobile evidence capture, and multi-tier supervisor closure sign-off.
- **Human-in-the-Loop (HITL) AI Governance:** Artificial Intelligence (Google Gemini API) operates strictly in an **advisory and decision-support capacity**. High-impact actions (e.g., initiating major equipment downtime, ordering expensive spares, or taking pasteurization lines offline) strictly require authorized human approval with mandatory reason logging.
- **Strict Organizational Scope Isolation:** Cooperative chilling centers and dairy plants are isolated by organizational scope (`orgScope`), guaranteeing that technicians, managers, and external vendors only access assets, work orders, and audit records within their authorized jurisdiction.

---

## 2. High-Level Technology Stack & Architecture

```
+----------------------------------------------------------------------------------------------------+
|                                    CLIENT APPLICATION (Vercel)                                     |
|  - React.js 18 + Vite (SPA)                                                                        |
|  - Styling: Tailwind CSS (Modern Industrial / Dairy Clean UI Theme)                               |
|  - Routing: React Router DOM v6 with RBAC & Scope Guards                                           |
|  - Icons & UI Kits: Lucide-react, Headless UI / Radix primitives                                   |
|  - Charts & Data Viz: Recharts (Sensor Trends, Health Gauges, MTBF/MTTR Analytics, RUL Curves)     |
|  - Global State: React Context + Reducer (Auth, RBAC, Active Scope, Saved Views, Notifications)   |
|  - Network Client: Axios with Interceptors (Short-lived JWT Bearer, CSRF, auto-refresh, errors)    |
|  - Zero Frontend Secrets: Strictly NO Gemini API keys or DB credentials bundled in client code     |
+-------------------------------------------------+--------------------------------------------------+
                                                  | HTTPS / REST / WebSockets
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                  API & BACKEND SERVICES (Render)                                   |
|  - Node.js (v20+ LTS) + Express.js Modular Architecture                                            |
|  - Authentication: JSON Web Tokens (15-min Access Token + HTTP-Only Rotating Refresh Token)        |
|  - Password Hashing: bcryptjs (salt rounds = 12)                                                   |
|  - Request Validation: Zod Schemas (Strict runtime typing, bounds, and enum checks on all inputs)  |
|  - Rate Limiting: express-rate-limit & Helmet security headers                                     |
|  - Core Service Modules:                                                                           |
|    * Auth & RBAC Policy Engine (Backend Enforced)  * Asset Registry & Hierarchy Service           |
|    * Organizational Scope Isolation Middleware    * Telemetry & IoT Ingestion Processor           |
|    * Work Order & Maintenance State Machine       * Asynchronous Cron Engine (RUL/Health scoring) |
|    * Append-Only Immutable Audit Logger           * Export Engine (CSV / PDF Stream Generators)   |
|    * Notification Dispatcher & User Preferences   * AI Governance & Verification Service          |
+------------------------+-------------------------------------------------+-------------------------+
                         |                                                 |
                         v                                                 v
+----------------------------------+             +---------------------------------------------------+
|      GOOGLE GEMINI API (AI)      |             |             PERSISTENCE LAYER (MongoDB)           |
|  - Model: Gemini 2.5 Flash / Pro |             |  MongoDB Atlas (Replica Set)                      |
|  - JSON Schema Enforcement       |             |  - Internal IDs: MongoDB ObjectId                 |
|  - Zero Hidden CoT Explainability|             |  - Business/Idempotency IDs: UUID v4              |
|  - Dairy Failure Heuristics      |             |  - Collections: Domain, Asset, System Entities    |
|  - Strict Telemetry Traceability |             |  - Compound Indexes: { assetId: 1, timestamp: -1 }|
|  - Confidence vs. Risk Metrics   |             |  - Immutable Audit Collection (Mongoose Hooks)    |
+----------------------------------+             +---------------------------------------------------+
```

---

## 3. Database Schema & Storage (MongoDB)

### 3.1 Architectural Identifiers & Conventions
- **MongoDB `_id` (`ObjectId`):** Used internally for fast primary key indexing, foreign document relationships (`ref`), and B-tree optimization.
- **Business UUIDs & External Identifiers:** Exposed externally for idempotency, safe API communication, and offline-sync tracking (e.g., `assetTag`: `"BMC-MYSORE-014"`, `workOrderNumber`: `"WO-2026-0819"`, `idempotencyKey`: UUID v4).
- **Concurrency & Soft Deletion:** Optimistic concurrency control via Mongoose version key (`__v`) and soft deletion (`isDeleted: Boolean`, `deletedAt: Date`).
- **Organizational Scope:** Every primary domain and asset entity includes `orgScope: { cooperativeZone: String, plantId: String, centerId: String }` to strictly enforce data scoping.

### 3.2 Domain Entities
1. **`farmers`**:
   - `_id`: ObjectId, `farmerId` (UUID/Business ID, e.g. `FMR-KA-1029`), `fullName`, `phone`, `village`, `centerId` (ref: `collection_centres`), `orgScope`: Object, `cattleCount`, `bankAccount`: `{ bankName, ifsc, accountNumber }`, `isActive`: Boolean, `createdAt`, `updatedAt`.
2. **`collection_centres`** (Village Collection Centre / Chilling Centre):
   - `_id`: ObjectId, `centerId` (e.g. `VCC-MYSORE-01`), `name`, `taluk`, `district`, `storageCapacityLiters`, `geoCoordinates`: `{ lat, lng }`, `contactPerson`, `assignedBmcAssetIds`: `[ObjectId]`, `orgScope`: Object.
3. **`milk_lots` & `milk_tests`**:
   - `_id`: ObjectId, `lotId` (UUID), `centerId`: ObjectId, `orgScope`: Object, `shift`: `'MORNING' | 'EVENING'`, `collectionTimestamp`: Date, `totalVolumeLiters`: Number, `fatPercentage`: Number, `snfPercentage`: Number, `clrReading`: Number, `temperatureAtIntake`: Number, `clotOnBoiling`: Boolean, `adulterationDetected`: Boolean, `qualityGrade`: `'A' | 'B' | 'REJECTED'`.
4. **`milk_tankers`**:
   - `_id`: ObjectId, `tankerNumber` (e.g. `KA-09-EA-4412`), `driverName`, `driverPhone`, `capacityLiters`, `compartments`: `[{ compartmentNumber, volumeLiters, currentTempC, sealStatus }]`, `currentLocation`: `{ lat, lng, lastPing }`, `routeStatus`: `'AT_CHILLING_CENTRE' | 'IN_TRANSIT' | 'UNLOADING_AT_DAIRY' | 'CIP_CLEANING'`, `orgScope`: Object.
5. **`batches` & `products`**:
   - `_id`: ObjectId, `batchNumber` (e.g. `BATCH-2026-M-041`), `productType`: `'STANDARDIZED_MILK' | 'TONED_MILK' | 'CURD' | 'GHEE' | 'BUTTER' | 'PANEER'`, `pasteurizerAssetId`: ObjectId, `homogenizerAssetId`: ObjectId, `packagingLineAssetId`: ObjectId, `volumeProcessed`: Number, `startTime`: Date, `endTime`: Date, `qualitySignoffBy`: ObjectId, `orgScope`: Object.
6. **`inventory_parts`**:
   - `_id`: ObjectId, `partNumber` (UUID/Code), `partName`: String (e.g., *"Copeland 5HP Compressor Valve Plate"*, *"EPDM Pasteurizer Plate Gasket"*, *"Homogenizer Ceramic Plunger"*), `category`: `'REFRIGERATION' | 'SEALS_GASKETS' | 'PUMPS_MOTORS' | 'ELECTRICAL' | 'SENSORS'`, `quantityOnHand`: Number, `minReorderLevel`: Number, `unitCost`: Number, `storageLocation`: String, `orgScope`: Object.

### 3.3 Asset Entities
1. **`assets`**:
   - `_id`: ObjectId, `assetTag` (String, unique, indexed, e.g. `BMC-BLR-012`, `PST-LINE-01`), `name`: String, `category`: `'BULK_MILK_COOLER' | 'CHILLED_TANKER' | 'PASTEURIZER' | 'HOMOGENIZER' | 'COLD_ROOM' | 'PACKAGING_MACHINE'`, `owner`: `{ ownerType: 'COOPERATIVE' | 'CONTRACTOR' | 'VILLAGE_SOCIETY', ownerName: String, contactPhone: String }`, `orgScope`: `{ cooperativeZone: String, plantId: String, centerId: String }`, `location`: `{ facilityName: String, department: String, building: String, gpsCoordinates: { lat: Number, lng: Number } }`, `criticality`: `'CRITICAL_P0' | 'HIGH_P1' | 'MEDIUM_P2' | 'LOW_P3'`, `ratedCapacity`: String, `specifications`: Map/Object, `installationDate`: Date, `warrantyExpiry`: Date, `totalRuntimeHours`: Number, `currentStatus`: `'OPERATIONAL' | 'WARNING' | 'CRITICAL_FAULT' | 'UNDER_MAINTENANCE' | 'DECOMMISSIONED'`, `currentHealthScore`: Number (0–100), `failureRiskLevel`: `'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'`, `assignedTechnicianId`: ObjectId, `lastInspectionDate`: Date.
2. **`sensor_telemetry`**:
   - `_id`: ObjectId, `assetId`: ObjectId (indexed), `sensorId`: String, `metricType`: `'TEMPERATURE' | 'DISCHARGE_PRESSURE' | 'SUCTION_PRESSURE' | 'VIBRATION_RMS' | 'CIP_FLOW_RATE' | 'MOTOR_CURRENT_AMPS' | 'AGITATOR_RPM'`, `metricValue`: Number, `unit`: String, `timestamp`: Date (indexed), `isAnomaly`: Boolean, `thresholdRange`: `{ normalMin: Number, normalMax: Number }`, `orgScope`: Object.
   - *Time-Series Compound Index:* `{ assetId: 1, timestamp: -1 }` and `{ orgScope: 1, timestamp: -1 }`.
3. **`inspections`**:
   - `_id`: ObjectId, `inspectionId` (UUID), `assetId`: ObjectId, `inspectorUserId`: ObjectId, `inspectionDate`: Date, `checklist`: `[{ checkItem: String, result: 'PASS' | 'FAIL' | 'ADVISORY', notes: String }]`, `evidencePhotos`: `[{ url: String, checksum: String, capturedAt: Date }]`, `audioNotesUrl`: String, `overallCondition`: `'EXCELLENT' | 'FAIR' | 'POOR'`, `orgScope`: Object.
4. **`work_orders`**:
   - `_id`: ObjectId, `workOrderNumber` (String, unique, indexed, e.g. `WO-2026-0819`), `assetId`: ObjectId, `title`: String, `description`: String, `priority`: `'CRITICAL_P0' | 'HIGH_P1' | 'MEDIUM_P2' | 'LOW_P3'`, `source`: `'MANUAL' | 'PREVENTIVE_SCHEDULE' | 'AI_PREDICTIVE_TRIGGER'`, `status`: `'NORMAL' | 'WARNING' | 'CRITICAL' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CREATED' | 'ASSIGNED' | 'IN_PROGRESS' | 'DEFERRED' | 'ESCALATED' | 'CLOSED'`, `assignedTechnicianId`: ObjectId, `createdById`: ObjectId, `approvedById`: ObjectId, `scheduledStartDate`: Date, `scheduledEndDate`: Date, `actualStartDate`: Date, `actualCompletionDate`: Date, `requiredSkills`: `[String]`, `partsRequired`: `[{ partId: ObjectId, partName: String, quantityReserved: Number, quantityConsumed: Number, unitCost: Number }]`, `estimatedDowntimeHours`: Number, `actualDowntimeHours`: Number, `closureDetails`: `{ summaryOfWork: String, photos: [String], signoffSignatureName: String, closedAt: Date, supervisorNotes: String }`, `orgScope`: Object.
5. **`failure_predictions` (AI Output Store)**:
   - `_id`: ObjectId, `predictionId` (UUID), `assetId`: ObjectId, `predictedFailureMode`: String, `riskLevel`: `'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'`, `confidenceScore`: Number (0.00 – 1.00), `remainingUsefulLifeDays`: Number, `contributingTelemetrySnapshot`: Object, `aiExplanation`: String, `recommendedActions`: `[String]`, `modelMetadata`: `{ modelName: String, modelVersion: String, promptVersion: String, executionTimestamp: Date }`, `reviewStatus`: `'PENDING_REVIEW' | 'ACCEPTED' | 'OVERRIDDEN' | 'REJECTED'`, `reviewDecision`: `{ reviewedBy: ObjectId, reviewedAt: Date, overrideReason: String, convertedWorkOrderId: ObjectId, modifiedPriority: String }`, `orgScope`: Object.

### 3.4 System Entities
1. **`users`**:
   - `_id`: ObjectId, `userId` (UUID), `email`: String (unique, indexed), `passwordHash`: String, `fullName`: String, `role`: `'MAINTENANCE_ADMIN' | 'OPERATIONS_MANAGER' | 'TECHNICIAN' | 'VENDOR'`, `orgScope`: `{ cooperativeZone: String, assignedPlants: [String], assignedCenters: [String] }`, `phone`: String, `accountStatus`: `'ACTIVE' | 'DEACTIVATED' | 'SUSPENDED' | 'INVITED'`, `lastLoginAt`: Date, `lastLoginIp`: String, `accessHistory`: `[{ timestamp: Date, ip: String, userAgent: String, success: Boolean }]`, `failedLoginAttempts`: Number, `lockUntil`: Date.
2. **`audit_logs` (Append-Only / Immutable)**:
   - `_id`: ObjectId, `logId` (UUID), `actorId`: ObjectId, `actorRole`: String, `action`: `'LOGIN' | 'LOGOUT' | 'AUTHENTICATION' | 'DATA_ACCESS' | 'CREATE' | 'MODIFY' | 'DELETE' | 'EXPORT' | 'AI_EXECUTION' | 'APPROVAL' | 'REJECTION' | 'OVERRIDE' | 'CONFIG_CHANGE'`, `resourceType`: String, `resourceId`: String, `orgScope`: Object, `outcome`: `'SUCCESS' | 'FAILURE' | 'ACCESS_DENIED'`, `ipAddress`: String, `userAgent`: String, `previousState`: Object, `newState`: Object, `reason`: String, `timestamp`: Date (indexed).
   - *Immutability Protection:* Mongoose middleware explicitly throws runtime errors on `update`, `updateOne`, `updateMany`, `deleteOne`, `deleteMany`, `findOneAndDelete`, and `drop`.
3. **`notifications`**:
   - `_id`: ObjectId, `notificationId` (UUID), `recipientUserId`: ObjectId, `roleScope`: String, `orgScope`: Object, `eventType`: `'ASSIGNMENT' | 'EXCEPTION' | 'APPROVAL' | 'ALERT' | 'DUE_DATE' | 'AI_RESULT' | 'SYSTEM_EVENT'`, `severity`: `'INFO' | 'WARNING' | 'CRITICAL_URGENT'`, `category`: `'UNREAD' | 'READ' | 'URGENT' | 'ASSIGNED' | 'SYSTEM_GENERATED'`, `title`: String, `message`: String, `relatedEntity`: `{ entityType: String, entityId: String }`, `targetLink`: String, `isRead`: Boolean, `clearedAt`: Date, `createdAt`: Date (indexed).
4. **`reports_metadata`**:
   - `_id`: ObjectId, `reportId` (UUID, e.g. `RPT-2026-0041`), `reportName`: String, `reportType`: `'ASSET_HEALTH_RELIABILITY' | 'FAILURE_RISK_RUL' | 'MAINTENANCE_PLANNING' | 'TECHNICIAN_WORK_ORDERS' | 'DOWNTIME_COST_EFFECTIVENESS'`, `filtersApplied`: Object, `comparisonPeriod`: `{ enabled: Boolean, basePeriod: String, comparePeriod: String }`, `format`: `'PDF' | 'CSV'`, `generationStatus`: `'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED'`, `fileSizeBytes`: Number, `downloadUrl`: String, `generatedBy`: ObjectId, `orgScope`: Object, `createdAt`: Date.
5. **`mlops_metrics`**:
   - `_id`: ObjectId, `evaluationDate`: Date (indexed), `assetCategory`: String, `orgScope`: Object, `totalPredictions`: Number, `truePositives`: Number, `falseAlarms`: Number, `missedFailures`: Number, `avgLeadTimeHours`: Number, `maintenanceEffectivenessScore`: Number, `driftIndex`: Number, `accuracyScore`: Number, `latencyMs`: Number, `failureRate`: Number, `adoptionRate`: Number.

---

## 4. Complete Specifications for the 12 Frontend Modules

### Global UI/UX, Navigation & Security Requirements
Every module across the application strictly implements the following foundational design rules:
- **Responsive Across 3 Viewports:** Mobile (<480px) with single-column touch cards, Tablet (768px–1024px) with adaptive grids, and Desktop (1024px+) with multi-column dashboards.
- **Consistent Page Chrome:** Breadcrumbs (`Home > Assets > Detail`), standardized Page Header (Title, Scope Pill, Action Buttons), and collapsible Sidebar Navigation.
- **Universal State Handling Contract:** Every page provides explicit states:
  1. *Loading State:* Pulse skeletons matching the component layout.
  2. *Success State:* High-contrast tables/cards with transition animations.
  3. *Empty State:* Informative illustration, descriptive message, and a primary CTA.
  4. *Error State:* Error banner with technical code, human explanation, and "Retry Request" trigger.
  5. *Validation Feedback:* Inline field validation messages and toast notifications.
- **Data Controls:** Global debounce search (300ms), multi-select filter drawers, column sorting, pagination controls (`Rows per page: 10, 25, 50`), and saved view presets.
- **Strict RBAC Visibility:** Frontend UI checks user permissions and hides unauthorized buttons or routes, while backend middleware strictly enforces $403\text{ Forbidden}$ rejections.
- **Zero Frontend Secrets:** No Gemini API keys or database connection strings exist in Vite or frontend bundles.

```
+----------------------------------------------------------------------------------------------------+
|                                    12 APPLICATION MODULES MATRIX                                   |
+----+----------------------------------------------+---------------------------+--------------------+
| #  | Module Name                                  | Primary Stakeholders      | Route              |
+----+----------------------------------------------+---------------------------+--------------------+
| 01 | Secure Login & Session Gateway               | All Users                 | /login             |
| 02 | Asset Registry & Health Dashboard            | Ops Manager, Admin        | /assets            |
| 03 | Asset Detail & Maintenance History Page      | Admin, Tech, Ops Manager  | /assets/:assetId   |
| 04 | Maintenance Calendar & Technician Queue Page | Technician, Admin         | /calendar          |
| 05 | Maintenance Planning & Closure Verification  | Admin, Ops Manager, Tech  | /planning          |
| 06 | Failure Risk & Remaining Useful Life (RUL)   | Ops Manager, Admin, Tech  | /predictions/rul   |
| 07 | Maintenance Recommendations (HITL Advisory)  | Admin, Ops Manager        | /recommendations   |
| 08 | Reliability & Model Performance Page (MLOps) | Admin, Data Lead          | /mlops-performance|
| 09 | Reports & Visual Analytics Hub               | Ops Manager, Admin        | /analytics-reports |
| 10 | Notifications Center & Sliding Panel         | All Users                 | /notifications     |
| 11 | User & Role Management (RBAC Admin Hub)      | Maintenance Admin         | /users             |
| 12 | Audit Logs & Master Settings Page            | Maintenance Admin         | /audit-settings    |
+----+----------------------------------------------+---------------------------+--------------------+
```

---

### Detailed Module Specifications

#### Module 01: Secure Login Page (`/login`)
- **UI Components & Inputs:**
  - Email field with RFC-compliant validation, password field with accessible Show/Hide toggle.
  - "Remember Me" toggle (persists encrypted session token identifier).
  - "Forgot Password" modal triggering email verification flow.
- **Explicit Authentication States:**
  - *Idle State:* Clean, centered card on high-contrast dairy-theme background.
  - *Loading Handshake State:* Disabled inputs, loading spinner inside submit button, displaying *"Authenticating with Dairy Cooperative Gateway..."*.
  - *Success State:* Green confirmation checkmark, displaying *"Authentication verified. Routing to your workspace..."*.
  - *Validation State:* Real-time inline field feedback on format and password requirements.
  - *Authentication-Error State:* Red alert box showing specific error (e.g., *"Invalid email or password"* or *"Account deactivated by Maintenance Admin"*).
- **Session & Routing Flow:**
  - Authenticates users using JSON Web Tokens (short-lived access JWT + HTTP-only secure rotating refresh cookie).
  - Routes immediately to role-specific default dashboard:
    - `TECHNICIAN` $\rightarrow$ `/calendar` (technician queue view)
    - `OPERATIONS_MANAGER` $\rightarrow$ `/assets` (plant health dashboard)
    - `MAINTENANCE_ADMIN` $\rightarrow$ `/assets` (full cooperative overview)
    - `VENDOR` $\rightarrow$ `/planning` (assigned external work orders)

#### Module 02: Asset Registry & Health Dashboard (`/assets`)
- **Equipment Coverage:** Bulk Milk Coolers (BMCs), Tankers, Processing Lines, Pasteurisers, Cold Rooms, and Packaging Equipment.
- **Key Status Indicators & Metrics:**
  - Active Fleet Health Index (%), Total Registered Assets, Active Critical Exceptions (P0/P1), Assets under Imminent RUL Risk (< 7 days).
- **Comprehensive Filters:**
  - *Date Range:* Installation date, warranty expiry window, last inspection date.
  - *Location:* Cooperative Zone, Chilling Center (VCC), or Dairy Plant.
  - *Category:* Bulk Milk Coolers, Tankers, Processing Lines, Pasteurisers, Cold Rooms, Packaging Equipment.
  - *Owner:* Cooperative-owned, Contractor-leased, Village Society.
  - *Status:* Operational, Warning, Critical Fault, Under Maintenance, Decommissioned.
  - *Risk Level:* Low, Medium, High, Critical / Imminent.
- **Dual View Layout:**
  - *Card Grid View:* Interactive cards showing asset tag, health score color bar (0–100), risk pill, owner name, and quick-action buttons (*"Inspect"*, *"View Sensors"*, *"Create WO"*).
  - *Tabular View:* Sortable table columns with pagination, search, and saved view presets (e.g., *"My Plant P0 Assets"*, *"Expiring Warranty Tankers"*).

#### Module 03: Asset Detail & Maintenance History Page (`/assets/:assetId`)
- **Displayed Specifications:**
  - Condition, Location, Owner, Total Runtime Hours, Sensor Trends, Maintenance History, Warranty, Criticality (`P0`–`P3`), Spare-Part Status, and Open Work Orders.
- **Interactive Sensor Trends (Recharts):**
  - BMC: Milk temperature (°C), agitator RPM, suction pressure (bar), discharge pressure (bar).
  - Pasteuriser: Regeneration temp, holding tube temp (72°C baseline), CIP caustic wash flow rate (L/min).
  - Chilled Tanker: In-transit route temperature log vs. vehicle GPS speed.
- **Data Controls & Management:**
  - Global search, multi-parameter filtering, column sorting, pagination on telemetry and maintenance tables.
  - Record details view, linked work orders, linked spare parts, and printable QR code for physical field scanning.
  - Version or activity history log tracking every access and modification.
- **Scope & Role Restriction:**
  - Restricts records and available actions strictly according to the signed-in user's role and permitted organisational scope.

#### Module 04: Maintenance Calendar & Technician Queue Page (`/calendar`)
- **Key Capabilities:**
  - Preventive-maintenance calendars (Month, Week, Day Gantt-style view).
  - Failure-risk alerts: Highlighting equipment with AI-detected impending breakdown windows.
  - Technician queues: "My Jobs Today" prioritized queue for mobile and field use.
  - Inspection checklists: Standardized pass/fail checklist items with advisory notes.
  - **Mobile-Friendly Evidence Capture:**
    - Live camera upload for photo verification of equipment condition.
    - Audio voice note recorder for hands-free repair notes.
    - Geolocation GPS stamp on task submission.
  - Downtime analytics: Real-time calculation of projected vs. allowable plant stoppage hours.
- **Clear Status States:**
  - High-visibility indicators for `normal`, `warning`, `critical`, `pending-review`, `approved`, `rejected`, and `completed`.
- **Drill-Down Capabilities:**
  - Direct drill-down from calendar summaries into the underlying work order records and uploaded supporting evidence.

#### Module 05: Maintenance Planning & Closure Verification Page (`/planning`)
- **Interactive Planning Board:**
  - Visual matrix/kanban detailing priority, required technician skills, warehouse parts availability, and expected downtime.
- **Authorized Lifecycle Actions:**
  - Full authorization lifecycle: `create`, `assign`, `edit`, `approve`, `reject`, `defer`, `override`, `escalate`, and `close`.
- **Material Decision Audit Trail:**
  - Strictly records the **actor**, **timestamp**, **reason**, **previous value**, **new value**, and **outcome** for every material planning and closure decision.
  - Multi-tier supervisor sign-off with electronic signature notes for final closure.

#### Module 06: Failure Risk & Remaining Useful Life Page (`/predictions/rul`)
- **Multimodal Telemetry & History Analysis:**
  - Analyses telemetry, inspections, work orders, usage, environment, and history for BMCs, tankers, processing lines, pasteurisers, cold rooms, and packaging equipment to detect anomalies and estimate failure risk or RUL.
- **Key Output Display:**
  - Prediction result, confidence score (0%–100%), contributing inputs, concise explanation, timestamp, model version (`Gemini 2.5 Flash`, `v2.4-dairy`), and source-data snapshot modal.
- **Explicit Failure & Operational UI States:**
  1. *Loading State:* Animated neural telemetry scanner skeleton.
  2. *Unavailable-Model State:* Notice when AI model service is temporarily unreachable, falling back to rule-based safety thresholds.
  3. *Insufficient-Data State:* Displayed when required telemetry is missing or stale (> 6 hours); strictly forbids fabrication.
  4. *Low-Confidence State:* Displayed when confidence is < 65%, mandating physical inspection before action.
  5. *Failed-Prediction State:* Error card with diagnostic code and manual retry trigger.

#### Module 07: Maintenance Recommendations Page (`/recommendations`)
- **Comprehensive Recommendation Cards:**
  - Suggests maintenance timing, required skills, probable parts, expected downtime, and priority based on criticality, safety, cost, and operational impact (e.g., *"5,000 Liters at risk, ~₹2,15,000 value"*).
- **Strict Separation of Concerns:**
  - Prominent visual separation between *"AI Suggestion (Advisory Only)"* and *"Approved Business Decision"*.
- **Authorized Review Controls:**
  - Authorised reviewers can `accept`, `reject`, `correct`, or `override` an AI output.
  - **Mandatory Reason Requirement:** System enforces a mandatory reason selection and explanation note before submitting any review decision.

#### Module 08: Reliability & Model Performance Page (`/mlops-performance`)
- **MLOps Metric Tracking:**
  - Tracks false alarms, missed failures, prediction lead time, maintenance effectiveness, drift, and model performance by asset class (BMCs, Tankers, Pasteurizers, Homogenizers, Packaging).
- **Ground-Truth Comparison & Feedback:**
  - Compares recommendations and predictions with actual physical outcomes recorded after equipment disassembly.
  - Captures technician feedback via interactive feedback loop.
- **Performance Indicators:**
  - Displays project indicators for **quality**, **accuracy**, **drift**, **latency**, **failure**, and **adoption**.

#### Module 09: Reports & Analytics Page (`/analytics-reports`)
- **Visual Analysis Modules:**
  1. Asset health and reliability dashboard for BMCs, tankers, processing lines, pasteurisers, cold rooms, and packaging equipment.
  2. Failure-risk, anomaly, and remaining-life estimates.
  3. Preventive and predictive maintenance planning.
  4. Technician work orders, evidence capture, parts planning, and closure verification.
  5. Downtime, maintenance cost, false-alarm, and effectiveness analytics.
- **Configuration & Comparison:**
  - Date ranges (Today, 7D, MTD, QTD, YTD, Custom), **comparison periods** (MoM, QoQ, YoY), relevant business filters, drill-down views, and saved report configurations.
- **Export & Execution Tracking:**
  - Export filtered reports in **CSV** or **PDF** format with cooperative letterhead styling.
  - Report-generation status indicator (`PENDING` $\rightarrow$ `GENERATING` $\rightarrow$ `COMPLETED`).
  - Searchable history of generated reports with file metadata and one-click re-download.

#### Module 10: Notifications Page and Panel (`/notifications`)
- **Dual Presentation:**
  - In-app notification sliding panel in the header with unread badge counter.
  - Complete, full-page notifications management view.
- **Categorization & Scope:**
  - Covers assignments, exceptions, approvals, alerts, due dates, AI results, and system events.
  - Displays notifications organized by **unread**, **read**, **urgent**, **assigned**, and **system-generated**.
- **User Actions & Preferences:**
  - Allows users to mark notifications as read, clear selected notifications, and deep-link open the related record.
  - Supports configurable notification preferences based on role, event type, severity, ownership, and organisational scope.

#### Module 11: User and Role Management Page (`/users`)
- **Project Role Governance:**
  - Enforces least-privilege defaults for the 4 project roles:
    - `MAINTENANCE_ADMIN`: Full administrative control, user/role management, security policies, master data, configuration, integrations, and audit access.
    - `OPERATIONS_MANAGER`: Asset health oversight, work order authorization, accept/override AI recommendations, analytics export.
    - `TECHNICIAN`: Assigned work order queue execution, inspection checklists, mobile evidence upload, submission for closure.
    - `VENDOR`: External contractor access restricted strictly to assigned equipment tickets and spare parts delivery tracking.
- **Administrative Operations:**
  - Allows administrators to create, view, edit, activate, deactivate, and search users.
  - Manages roles, permissions, organisational access (zones, plants), and privileged actions.
  - Displays account status, assigned role, last login timestamp, IP, and access history log.

#### Module 12: Audit Logs and System Settings Page (`/audit-settings`)
- **Searchable Immutable Audit Logs:**
  - Searchable, non-editable logs for authentication, data access, record creation, modification, deletion, export, AI execution, approval, rejection, override, and configuration changes.
  - **Comprehensive Multi-Dimensional Filters:** Filter by **User**, **Role**, **Action**, **Entity**, **Date**, **Outcome** (`SUCCESS`, `FAILURE`, `ACCESS_DENIED`), and relevant **Organisational Scope**.
  - Strict immutability: Normal users and API callers are strictly prevented from modifying or deleting audit records.
- **Master System Configuration:**
  - Allows administrators to configure:
    - *Master Data:* Register chilling centers, plants, equipment types, milk temperature limits ($4^\circ\text{C}$ alarm ceiling).
    - *Workflow Rules:* Define escalation timelines for unassigned or overdue work orders.
    - *Thresholds & AI Settings:* Minimum confidence threshold (default 75%), RUL warning window (default 7 days).
    - *Integrations:* IoT gateway webhook endpoints and SCADA simulator switches.
    - *Notification Rules:* Default alert routing rules by event severity.

---

## 5. Backend Architecture & REST API Service Layer

### 5.1 Service Directory Layout
```
backend/
├── src/
│   ├── config/
│   │   ├── db.js                 # MongoDB connection & replica set retry logic
│   │   ├── gemini.js             # Google Gemini SDK initialization
│   │   └── constants.js          # Dairy thresholds, status enums, role definitions
│   ├── controllers/
│   │   ├── authController.js     # Login, token refresh, password reset
│   │   ├── assetController.js    # CRUD, telemetry query, health scoring, scope filtering
│   │   ├── workOrderController.js# State machine transitions, evidence upload, closure verification
│   │   ├── aiController.js       # Prediction triggers, HITL review decisions, MLOps metrics
│   │   ├── analyticsController.js# Dashboard statistics, comparison periods, CSV/PDF export
│   │   ├── userController.js     # User management, RBAC enforcement, session history
│   │   ├── auditController.js    # Immutable audit query engine with multi-filters
│   │   └── notificationController.js # Notification feed, read states, preferences
│   ├── middleware/
│   │   ├── authMiddleware.js     # Short-lived JWT verification & user attachment
│   │   ├── rbacMiddleware.js     # Strict role permission checker
│   │   ├── scopeMiddleware.js    # Organizational scope query injector (zone/plant isolation)
│   │   ├── validateMiddleware.js # Zod schema request validation
│   │   ├── auditMiddleware.js    # Automatic mutation diff recorder
│   │   └── errorMiddleware.js    # Structured JSON error responses
│   ├── models/                   # Mongoose entity schemas (Domain, Asset, System)
│   ├── routes/                   # Express router registrations (/api/v1/...)
│   ├── services/
│   │   ├── aiGovernanceService.js# Gemini prompt builder, response parser, guardrails
│   │   ├── telemetryService.js   # IoT sink, threshold evaluation, anomaly detection
│   │   └── cronService.js        # Scheduled background tasks (RUL, health score updates)
│   ├── utils/
│   │   ├── apiResponse.js        # Standardized API response formatter
│   │   └── seeder.js             # High-fidelity realistic dairy dataset seeder
│   └── app.js                    # Express app configuration & middleware pipeline
├── server.js                     # Server entry point
├── package.json
└── .env.example
```

### 5.2 Core API Endpoints Specification

| Route | Method | Access / Role | Description |
| :--- | :---: | :---: | :--- |
| `/api/v1/auth/login` | `POST` | Public | Authenticates credentials; returns short-lived JWT and sets HTTP-only refresh cookie. |
| `/api/v1/auth/refresh` | `POST` | Public | Rotates refresh token and issues new access JWT. |
| `/api/v1/auth/me` | `GET` | Authenticated | Returns current authenticated user information and organizational scope. |
| `/api/v1/assets` | `GET` | All Roles | Lists assets scoped by user zone/plant with pagination, search, category, owner, and risk filters. |
| `/api/v1/assets` | `POST` | Admin, Ops | Registers a new dairy asset with location, owner, and specs. |
| `/api/v1/assets/:id` | `GET` | All Roles | Returns asset profile, current health score, and runtime hours. |
| `/api/v1/assets/:id/telemetry` | `GET` | All Roles | Retrieves time-series sensor data with date range filtering. |
| `/api/v1/assets/:id/sensor-trends`| `GET` | All Roles | Aggregated telemetry data formatted for Recharts components. |
| `/api/v1/telemetry/ingest` | `POST` | Ingestion / Admin | Ingests IoT/SCADA sensor telemetry and evaluates thresholds. |
| `/api/v1/work-orders` | `GET` | All Roles | Retrieves work orders scoped by organization, filtered by status, priority, or assignee. |
| `/api/v1/work-orders` | `POST` | Admin, Ops, Tech | Creates a work order with optional idempotency key. |
| `/api/v1/work-orders/:id/status`| `PATCH` | Role-Enforced | Advances state (`ASSIGNED`, `IN_PROGRESS`, `PENDING_APPROVAL`, `CLOSED`). |
| `/api/v1/work-orders/:id/evidence`| `POST`| Technician, Admin | Uploads mobile photos, audio notes, and completed checklists. |
| `/api/v1/work-orders/:id/verify`| `POST` | Admin, Ops | Multi-tier supervisor sign-off with mandatory reason logging. |
| `/api/v1/ai/predict/:assetId` | `POST` | Admin, Ops | Triggers Google Gemini predictive failure and RUL analysis. |
| `/api/v1/ai/recommendations` | `GET` | Admin, Ops | Lists active AI maintenance recommendations pending review. |
| `/api/v1/ai/recommendations/:id/review` | `POST` | Admin, Ops | HITL decision: Accept, Reject, Correct, or Override with mandatory reason. |
| `/api/v1/ai/mlops-metrics` | `GET` | Admin, Ops | Fetches false alarm rates, missed failures, lead times, and drift indicators. |
| `/api/v1/analytics/dashboard`| `GET` | All Roles | Summary KPIs for dashboard cards. |
| `/api/v1/analytics/export` | `GET` | Admin, Ops | Generates CSV or formatted PDF report with comparison periods. |
| `/api/v1/notifications` | `GET` | Authenticated | Lists notifications for current user with unread counts and categories. |
| `/api/v1/notifications/:id/read` | `PATCH` | Authenticated | Marks notification as read. |
| `/api/v1/users` | `GET` | Admin Only | Lists users with account status, last login, and roles. |
| `/api/v1/users` | `POST` | Admin Only | Creates a user and assigns an RBAC role and organizational scope. |
| `/api/v1/users/:id/status` | `PATCH` | Admin Only | Activates or deactivates user accounts. |
| `/api/v1/audit-logs` | `GET` | Admin Only | Searchable immutable audit trail with multi-filter query support. |

---

## 6. Generative AI Engine (Google Gemini Integration)

### 6.1 Scientific Principles & Distinction
1. **Confidence vs. Risk:**
   - **Confidence Score (0%–100%):** Measures statistical certainty based on sample density, variance, and model alignment.
   - **Risk Level (Low, Medium, High, Critical):** Measures operational hazard, safety implications, and economic loss. An anomaly with 70% confidence on a critical pasteurizer holding tube can represent a Critical Risk.
2. **Missing Telemetry & Zero Fabrication:**
   - If required sensor feeds are missing, intermittent, or older than 6 hours, the system strictly forbids generating fabricated estimates. It flags `INSUFFICIENT_DATA` and alerts technicians to inspect sensor connections.
3. **Traceability:**
   - Every inference record stores: `modelName`, `modelVersion`, `promptVersion`, `timestamp`, and an immutable `sourceDataSnapshot`.
4. **Validation Separation:**
   - Gemini-generated text explanations are presented as diagnostic summaries and suggestions, not statistically validated facts without supporting mathematical verification.

```
[ Telemetry History + Maintenance Records + Ambient Conditions ]
                           |
                           v
[ Context Builder & Baseline Deviation Analyzer ]
                           |
                           v
[ Telemetry Completeness Check ]
       ├── If Telemetry Missing/Stale -> Flag 'INSUFFICIENT_DATA' (No Fabrication)
       └── If Telemetry Valid:
              v
[ Google Gemini 2.5 Flash Inference (Structured JSON Schema) ]
              v
[ Zod Validator & Confidence Guardrail ]
       ├── If Confidence >= 65% -> Persist as 'PENDING_REVIEW'
       └── If Confidence < 65%  -> Flag 'LOW_CONFIDENCE' (Mandates Physical Inspection)
              v
[ Human-in-the-Loop Review Dashboard (Module 07) ]
```

### 6.2 Dairy Equipment Failure Mode Ontology
The AI system is initialized with domain-specific dairy failure signatures:
1. **Bulk Milk Cooler (BMC):**
   - *Failure Mode:* Compressor suction valve leakage / low refrigerant charge.
   - *Telemetry Pattern:* Chilling time exceeding 45 minutes to reach 4°C, suction pressure dropping below 2.2 bar, discharge temperature exceeding 85°C.
   - *Operational Risk:* Milk temperature rises above 6°C; rapid bacterial multiplication; milk souring.
2. **Plate Pasteurizer:**
   - *Failure Mode:* Regeneration plate milk stone fouling / CIP wash flow decline.
   - *Telemetry Pattern:* Differential pressure across plates > 1.8 bar, CIP caustic return flow < 120 L/min, holding tube temperature oscillation.
   - *Operational Risk:* Incomplete pasteurization; food safety violation; production halt.
3. **Road Milk Tanker:**
   - *Failure Mode:* Auxiliary refrigeration failure or agitator motor failure in transit.
   - *Telemetry Pattern:* Temperature rise > 0.5°C/hr; agitator current at 0A.
   - *Operational Risk:* Complete 10,000-liter tanker milk souring before arrival at mother dairy.
4. **Homogenizer:**
   - *Failure Mode:* 3-Plunger hydraulic packing seal wear.
   - *Telemetry Pattern:* High vibration spikes at plunger stroke frequency, hydraulic pressure fluctuation ±25 bar.
   - *Operational Risk:* Uneven fat globule dispersion; cream separation in retail milk pouches.

### 6.3 Explainability Standard
- **Zero Hidden Chain-of-Thought:** Outputs must never show cryptic reasoning tokens.
- **Evidence-Based Metrics:** The AI must explicitly cite observed sensor readings, baseline normal values, and delta percentages.

---

## 7. Security, RBAC & Data Integrity

### 7.1 Role-Based Access Control (RBAC) Matrix

| Permission / Action | Maintenance Admin | Operations Manager | Technician | Vendor |
| :--- | :---: | :---: | :---: | :---: |
| View Assets & Telemetry | Full Access | Full Access | Assigned Plants | Assigned Assets |
| Register / Edit Assets | Full Access | Read-Only | Read-Only | No Access |
| View Predictions & RUL | Full Access | Full Access | Read-Only | No Access |
| Accept / Reject / Correct / Override AI | Yes | Yes | No | No |
| Create Work Orders | Yes | Yes | Draft Only | No |
| Execute Work Orders & Upload Photos | Yes | No | Yes (Assigned) | Yes (Assigned) |
| Verify & Close Work Orders | Full Sign-off | Full Sign-off | Submit Only | No Access |
| View MLOps & Model Metrics | Full Access | View-Only | No Access | No Access |
| Export Analytics & Reports | Full Access | Full Access | Read-Only | No Access |
| Manage Users & Roles | Full Access | No Access | No Access | No Access |
| Access Immutable Audit Logs | Search / View | No Access | No Access | No Access |
| Modify System Settings | Full Access | View-Only | No Access | No Access |

### 7.2 Data Integrity & Security Standards
- **Token Security:** Short-lived JWTs (15 minutes) + HTTP-only secure rotating refresh tokens.
- **Password Protection:** bcryptjs with 12 salt rounds.
- **Organizational Data Access Restrictions:** Every database query executes through `scopeMiddleware`, enforcing that users can only read or write documents within their assigned cooperative zone or plant.
- **Audit Immutability:** Mongoose schema hooks strictly reject `update`, `delete`, and `drop` operations on the `audit_logs` collection.
- **Rate Limiting:** Protects `/api/v1/auth/login` (5 attempts per 15 min) and `/api/v1/ai/predict` (20 requests per min).
- **Zero Frontend Secret Exposure:** Vite environment variables only include public endpoints (`VITE_API_BASE_URL`).

---

## 8. Step-by-Step Implementation Roadmap

```
+----------------------------------------------------------------------------------------------------+
|                                    7-PHASE EXECUTION ROADMAP                                       |
+-------------------+---------------------------------------------------------+----------------------+
| Phase             | Scope & Deliverables                                    | Status               |
+-------------------+---------------------------------------------------------+----------------------+
| Phase 1: Setup    | Monorepo scaffold (frontend/ + backend/), Tailwind,     | Ready to Start       |
|                   | Vite, Express, dependencies, configuration files        |                      |
+-------------------+---------------------------------------------------------+----------------------+
| Phase 2: Data     | Mongoose schemas, indexes, dairy cooperative database   | Up Next              |
|                   | seeder with realistic assets, users, and telemetry      |                      |
+-------------------+---------------------------------------------------------+----------------------+
| Phase 3: Backend  | Auth, RBAC guards, Scope middleware, Asset CRUD,        | Planned              |
|                   | Work Order lifecycle, Audit logger, Validation schemas  |                      |
+-------------------+---------------------------------------------------------+----------------------+
| Phase 4: AI Engine| Google Gemini service, Dairy failure rules, HITL logic, | Planned              |
|                   | JSON output schemas, Traceability & Fallback heuristics |                      |
+-------------------+---------------------------------------------------------+----------------------+
| Phase 5: UI Shell | Navigation, Sidebar, Topbar with Notification drawer,   | Planned              |
|                   | Auth context, Scope switcher, Layout wrappers, Theme    |                      |
+-------------------+---------------------------------------------------------+----------------------+
| Phase 6: 12 Pages | Implementation of all 12 modules with deep interactivity| Planned              |
|                   | and responsive mobile technician capture workflows      |                      |
+-------------------+---------------------------------------------------------+----------------------+
| Phase 7: Polish   | End-to-end verification, RBAC testing, export checks,   | Planned              |
|                   | Deployment guides for Vercel and Render                 |                      |
+-------------------+---------------------------------------------------------+----------------------+
```

### Detailed Phase Tasks

#### Phase 1: Workspace Scaffolding & Setup
- Initialize repository with `frontend/` (React, Vite, Tailwind CSS, Lucide-react, Recharts, Axios) and `backend/` (Node.js, Express, Mongoose, Zod, JWT, bcryptjs).
- Configure environment variable templates (`.env.example`) and build scripts.

#### Phase 2: Database Schemas & Realistic Dairy Seeder
- Implement all Mongoose models for Domain, Asset, and System entities with organizational scope and immutability hooks.
- Build `seeder.js` populating:
  - 4 Demo Users: Admin (`admin@dairycoop.org`), Ops Manager (`ops@dairycoop.org`), Technician (`tech@dairycoop.org`), Vendor (`vendor@cooltech.com`).
  - 15+ Dairy Assets: BMCs, Tankers, Pasteurizers, Homogenizers across 4 chilling centers and 1 central processing dairy.
  - 500+ Telemetry Records: Normal baseline vs. deteriorating sensor profiles (e.g., BMC-018 suction valve failure scenario).

#### Phase 3: Backend APIs & State Machines
- Implement `/api/v1/auth` with secure JWT issuing and bcrypt validation.
- Implement `/api/v1/assets` and `/api/v1/telemetry` with time-series indexing and scope enforcement.
- Implement `/api/v1/work-orders` with strict lifecycle state machine and audit logger middleware.

#### Phase 4: Gemini AI Governance Service
- Implement `aiGovernanceService.js` with structured Gemini prompt engineering.
- Enforce JSON output schema validating confidence score, risk level, cited telemetry, and RUL days.
- Build human-in-the-loop review endpoints requiring mandatory reason logging for accept/reject/correct/override decisions.

#### Phase 5 & 6: 12-Module Frontend Construction
- Build responsive shell layout, sidebar navigation, and notification drawer.
- Build all 12 modules matching every functional specification from Section 4.
- Implement mobile-friendly camera evidence capture and touch-friendly technician queue.
- Implement interactive Recharts telemetry charts and CSV/PDF export generation with comparison periods.

#### Phase 7: Verification & Cloud Deployment Setup
- Validate all 4 role boundaries and verify audit log immutability.
- Test Gemini AI fallback when offline or without API key.
- Provide `DEPLOYMENT_GUIDE.md` for independent frontend (Vercel) and backend (Render) deployments.

---

## 9. Verification & Acceptance Criteria

1. **RBAC Strictness & Scoping:** Technicians cannot approve or close work orders; regular users cannot access user management or audit settings. Users cannot view assets outside their assigned organizational scope.
2. **AI Transparency & Non-Fabrication:** Every AI prediction displays confidence score, risk level, timestamp, model version, and exact input telemetry factors. Missing telemetry triggers `INSUFFICIENT_DATA` rather than fabricated values. Work orders are never auto-dispatched without human approval.
3. **Audit Immutability:** Audit records are strictly append-only; database modifications are recorded with previous/new state diffs, actor, role, outcome, and scope.
4. **Mobile Usability:** The technician queue and evidence capture modal operate seamlessly on mobile screens (< 480px).
5. **Zero Secret Leakage:** No API keys or database secrets exist in the frontend code.
