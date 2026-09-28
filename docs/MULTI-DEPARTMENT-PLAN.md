# Next Plan: Multi-Department System (IT, QC, Ops, HR)

## 🎯 Goal

Satu sistem bersama untuk 4 department (IT, QC, Ops, HR) dengan:
- **Sub-menu terpisah** per department
- **User management** per department
- **Dashboard** spesifik per department
- **RBAC** yang lebih granular

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    XINGHAO ITIS                              │
├─────────────┬─────────────┬─────────────┬─────────────────┤
│     IT      │     QC      │     Ops     │       HR        │
│  (existing) │  (new)      │  (new)      │    (new)        │
├─────────────┼─────────────┼─────────────┼─────────────────┤
│ Dashboard IT       │ Dashboard QC│ Dashboard Ops│ Dashboard HR    │
│ Master Item │ QC Check    │ Ops Task    │ Employee Data   │
│ Inventory   │ QC Report   │ Ops Schedule│ Leave Request   │
│ Headset     │ Defect Log  │ Fleet Mgmt  │ Payroll         │
│ PR/DO       │             │             │                 │
│ Booking     │             │             │                 │
│ Servis      │             │             │                 │
└─────────────┴─────────────┴─────────────┴─────────────────┘
```

---

## 📋 Phase 1: Foundation (Week 1-2)

### 1.1 Database Schema Changes

#### New Models

```prisma
// Department model
model Department {
  id          Int      @id @default(autoincrement())
  code        String   @unique  // IT, QC, OPS, HR
  name        String
  description String?
  createdAt   DateTime @default(now())
}

// User-Department relation (many-to-many)
model UserDepartment {
  id           Int      @id @default(autoincrement())
  userId       Int
  departmentId Int
  roleInDept   String   // Role within this department
  createdAt    DateTime @default(now())
  
  user       User       @relation(fields: [userId], references: [id])
  department Department @relation(fields: [departmentId], references: [id])
}

// QC Models
model QCCheck {
  id          Int      @id @default(autoincrement())
  checkCode   String   @unique
  date        DateTime @default(now())
  itemName    String
  itemCode    String?
  inspector   String
  result      String   // Pass, Fail, Rework
  note        String?
  createdAt   DateTime @default(now())
}

model QCDefectLog {
  id          Int      @id @default(autoincrement())
  defectCode  String   @unique
  date        DateTime @default(now())
  itemName    String
  defectType  String
  severity    String   // Low, Medium, High, Critical
  reportedBy  String
  status      String   @default("Open") // Open, In Progress, Resolved
  note        String?
  createdAt   DateTime @default(now())
}

// Ops Models
model OpsTask {
  id          Int      @id @default(autoincrement())
  taskCode    String   @unique
  date        DateTime @default(now())
  taskName    String
  assignee    String
  priority    String   // Low, Medium, High, Urgent
  status      String   @default("Pending") // Pending, In Progress, Done
  dueDate     DateTime?
  note        String?
  createdAt   DateTime @default(now())
}

model OpsSchedule {
  id          Int      @id @default(autoincrement())
  scheduleCode String  @unique
  date        DateTime @default(now())
  activity    String
  location    String
  pic         String
  startTime   String
  endTime     String
  note        String?
  createdAt   DateTime @default(now())
}

// HR Models
model Employee {
  id          Int      @id @default(autoincrement())
  employeeCode String  @unique
  nik         String   @unique
  name        String
  department  String
  position    String
  joinDate    DateTime
  status      String   @default("Active") // Active, Inactive, Resign
  phone       String?
  email       String?
  createdAt   DateTime @default(now())
}

model LeaveRequest {
  id          Int      @id @default(autoincrement())
  requestCode String   @unique
  employeeId  Int
  leaveType   String   // Annual, Sick, Personal, Other
  startDate   DateTime
  endDate     DateTime
  reason      String
  status      String   @default("Pending") // Pending, Approved, Rejected
  approvedBy  String?
  createdAt   DateTime @default(now())
}
```

### 1.2 RBAC Enhancement

```typescript
// New role hierarchy
type Role = 'SUPERADMIN' | 'SPV' | 'STAFF' | 'VENDOR';

// Department-specific permissions
type Department = 'IT' | 'QC' | 'OPS' | 'HR';

// Permission matrix per department
const DEPARTMENT_PERMISSIONS: Record<Department, Record<Role, Permission[]>> = {
  IT: { /* existing IT permissions */ },
  QC: {
    SUPERADMIN: ['create', 'read', 'update', 'delete'],
    SPV: ['create', 'read', 'update'],
    STAFF: ['create', 'read'],
    VENDOR: [],
  },
  OPS: {
    SUPERADMIN: ['create', 'read', 'update', 'delete'],
    SPV: ['create', 'read', 'update'],
    STAFF: ['create', 'read'],
    VENDOR: [],
  },
  HR: {
    SUPERADMIN: ['create', 'read', 'update', 'delete'],
    SPV: ['create', 'read', 'update'],
    STAFF: ['create', 'read'],
    VENDOR: [],
  },
};
```

### 1.3 User Enhancement

- Add `departmentId` field to User model
- User can belong to multiple departments
- Role can be different per department
- Login shows department selector if user has multiple

---

## 📋 Phase 2: UI/UX (Week 3-4)

### 2.1 Navigation Structure

```
Dashboard (role-based)
├── IT Dashboard (existing)
├── QC Dashboard (new)
├── Ops Dashboard (new)
└── HR Dashboard (new)

Master Data
├── Master Inventory (IT)
├── Master Vendor (IT)
├── Master Employee (HR)
└── Master Department (admin)

Operations
├── IT Operations
│   ├── Headset User
│   ├── Stock In/Out
│   ├── Booking Asset
│   ├── Servis Asset
│   └── Log Ruang Server
├── QC Operations
│   ├── QC Check
│   └── QC Defect Log
├── Ops Operations
│   ├── Ops Task
│   └── Ops Schedule
└── HR Operations
    ├── Employee Data
    └── Leave Request

Reports
├── IT Reports
├── QC Reports
├── Ops Reports
└── HR Reports
```

### 2.2 Dashboard per Department

**IT Dashboard** (existing, enhanced):
- KPI: Total Items, Active Loans, Pending PR, Stock Alerts
- Charts: Category distribution, Monthly trends

**QC Dashboard** (new):
- KPI: Total Checks, Pass Rate, Open Defects, Critical Issues
- Charts: Defect trends, Pass/Fail ratio

**Ops Dashboard** (new):
- KPI: Active Tasks, Pending Schedules, Overdue Items
- Charts: Task completion, Schedule overview

**HR Dashboard** (new):
- KPI: Total Employees, Active, On Leave, New Hires
- Charts: Department distribution, Leave trends

---

## 📋 Phase 3: Implementation (Week 5-8)

### 3.1 Backend

1. **Migrate database schema**
   - Add Department, UserDepartment models
   - Add QC, Ops, HR models
   - Run `prisma migrate`

2. **Update AuthContext**
   - Add department context
   - Department switcher
   - Permission check per department

3. **API Routes**
   - `/api/departments` - CRUD departments
   - `/api/qc/*` - QC endpoints
   - `/api/ops/*` - Ops endpoints
   - `/api/hr/*` - HR endpoints

### 3.2 Frontend

1. **Layout Changes**
   - Department selector in navbar
   - Sidebar grouped by department
   - Department-specific color theme

2. **Pages**
   - `/qc/dashboard` - QC Dashboard
   - `/qc/checks` - QC Check
   - `/qc/defects` - QC Defect Log
   - `/ops/dashboard` - Ops Dashboard
   - `/ops/tasks` - Ops Task
   - `/ops/schedules` - Ops Schedule
   - `/hr/dashboard` - HR Dashboard
   - `/hr/employees` - Employee Data
   - `/hr/leaves` - Leave Request

3. **Components**
   - `DepartmentSelector` - Switch between departments
   - `DepartmentDashboard` - Wrapper for dept-specific dashboards
   - `QCCheckForm`, `OpsTaskForm`, `EmployeeForm`, etc.

---

## 📋 Phase 4: Testing & Rollout (Week 9-10)

### 4.1 Testing
- Unit tests for new API routes
- Integration tests for department switching
- UAT with each department

### 4.2 Rollout
- Deploy to staging
- User training per department
- Go-live with all departments

---

## 🔧 Technical Considerations

### Database Migration Strategy
1. Create new tables alongside existing
2. Migrate user data to add departmentId
3. Backfill UserDepartment relations
4. Test thoroughly before dropping old columns

### Authentication Flow
```
Login → Select Department (if multiple) → Dashboard (dept-specific)
```

### Permission Check
```typescript
// Middleware to check department access
function requireDepartmentAccess(dept: Department, action: Action) {
  // Check if user has access to this department
  // Check if user has permission for this action in this department
}
```

### Data Isolation
- Each department sees only their own data
- SuperAdmin can see all departments
- Reports can be filtered by department

---

## 📊 Effort Estimate

| Phase | Duration | Effort |
|-------|----------|--------|
| Phase 1: Foundation | 2 weeks | High |
| Phase 2: UI/UX | 2 weeks | Medium |
| Phase 3: Implementation | 4 weeks | High |
| Phase 4: Testing & Rollout | 2 weeks | Medium |
| **Total** | **10 weeks** | - |

---

## 🚀 Quick Wins (Can be done immediately)

1. **Add department field to User model** - Simple schema change
2. **Create department selector UI** - Frontend only
3. **Add QC/Ops/HR menu items** - Placeholder pages
4. **Department-specific dashboard shells** - Basic KPI cards

---

## 📝 Notes

- Keep IT department as default for backward compatibility
- Use feature flags to gradually roll out new departments
- Consider microservices architecture if scale requires
- Plan for multi-tenant if needed in future
