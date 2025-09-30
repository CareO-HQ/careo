# CareO Home Management Software

## Project Overview

**iCare** is a comprehensive healthcare management platform built for UK care homes and healthcare providers. It provides digital solutions for resident care management, medication tracking, incident reporting, and regulatory compliance.

### Technology Stack
- **Frontend**: Next.js 15 with React 19, TypeScript
- **Backend**: Convex (real-time database)
- **Authentication**: Better Auth with session management
- **UI**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS v4
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts
- **Deployment**: Optimized for production with TypeScript strict mode

## Current Architecture

### Directory Structure
```
app/
├── (auth)/           # Authentication flows (login, signup, password reset)
├── (dashboard)/      # Main application dashboard
├── (onboarding)/     # User onboarding flow
├── (settings)/       # Application settings and configuration
├── (pdf)/           # PDF generation and handling
└── api/             # API routes and webhooks

components/
├── ui/              # Reusable UI components (shadcn/ui)
├── organization/    # Organization management components
└── providers/       # Context providers (theme, auth, analytics)

convex/
├── schema.ts        # Database schema definitions
├── auth.ts          # Authentication logic
├── residents.ts     # Resident management
├── medication.ts    # Medication tracking
├── incidents.ts     # Incident reporting
├── managerAudits.ts # Audit functionality
└── [feature].ts     # Feature-specific backend functions

lib/
├── auth-client.ts   # Client-side authentication
├── permissions.ts   # Role-based access control
├── date-utils.ts    # Date/time utilities
└── utils.ts         # General utilities
```

### Key Features Implemented

#### 1. **Resident Management System**
- **Location**: `app/(dashboard)/dashboard/residents/`
- **Functionality**:
  - Resident profiles with comprehensive care information
  - Care file management with document tracking
  - Hospital transfer coordination
  - Lifestyle and social care tracking
  - Data tables with filtering and pagination

#### 2. **Authentication & Authorization**
- **BetterAuth Integration**: Session-based authentication with role-based permissions
- **Security Middleware**: Route protection for dashboard and settings
- **Multi-factor Authentication**: Two-factor authentication support
- **Access Control**: Owner/Admin/Member role hierarchy

#### 3. **Healthcare Compliance Features**
- **Audit System**: Manager audits with form change tracking (`convex/managerAudits.ts`)
- **Incident Reporting**: Comprehensive incident forms with NHS trust reporting
- **Regulatory Compliance**: Built-in workflows for statutory reporting
- **Care Documentation**: Structured care file management with version control

#### 4. **Medical Management**
- **Medication Tracking**: Comprehensive medication administration records
- **Health Monitoring**: Vital signs tracking and health assessments
- **Care Plans**: Structured care planning with task management
- **Progress Notes**: Digital care note system with shift logging

#### 5. **Data Management**
- **Real-time Database**: Convex provides real-time data synchronization
- **Schema Validation**: Strict TypeScript typing with Zod validation
- **File Management**: Integrated file storage and PDF generation
- **Audit Trails**: Comprehensive change tracking for compliance

## Security & Healthcare Compliance

### Current Security Measures
- **Authentication**: Secure session management with Better Auth
- **Route Protection**: Middleware-based access control
- **Role-Based Permissions**: Granular access control system
- **Data Validation**: Zod schema validation throughout
- **Audit Logging**: Comprehensive change tracking for compliance

### Compliance Considerations
- **NHS Trust Integration**: Built-in incident reporting workflows
- **Care Documentation**: Structured documentation meeting UK healthcare standards
- **Data Protection**: Session-based authentication with secure cookie handling
- **Audit Requirements**: Manager audit system with form change detection

## Configuration

### Environment Setup
- **Development**: `npm run dev --turbopack` (Turbo mode enabled)
- **Build**: `npm run build` (production optimization)
- **Linting**: `npm run lint` (ESLint configuration)

### Key Configuration Files
- **Next.js**: `next.config.ts` - TypeScript config with typed routes
- **TypeScript**: `tsconfig.json` - Strict mode with path mapping
- **Convex**: `convex.config.ts` - Database and authentication config
- **Tailwind**: `tailwind.config.ts` - UI styling configuration

## Database Schema Highlights

### Core Entities
- **Users**: Authentication and profile management
- **Organizations/Teams**: Multi-tenant organization structure
- **Residents**: Patient/resident management with comprehensive care data
- **Care Files**: Document management with audit trails
- **Incidents**: Incident tracking with regulatory compliance
- **Medications**: Medicine administration records
- **Audits**: Manager audits with change detection

## Next Steps & Development Priorities

### 1. **Production Readiness** (Priority: Critical)
- **Security Audit**: Strengthen middleware.ts - current implementation is marked as "NOT SECURE"
- **Environment Configuration**: Secure production environment variables
- **Error Handling**: Implement comprehensive error boundaries
- **Performance Optimization**: Database query optimization and caching
- **Monitoring**: Add application monitoring and alerting

### 2. **Healthcare Compliance** (Priority: High)
- **GDPR Compliance**: Data protection impact assessment and privacy controls
- **NHS Standards**: Ensure full compliance with NHS Digital standards
- **Backup & Recovery**: Implement automated backup systems
- **Data Retention**: Configure data retention policies per UK healthcare requirements

### 3. **Feature Enhancements** (Priority: Medium)
- **Mobile Responsiveness**: Optimize for tablet/mobile care staff workflows
- **Reporting Dashboard**: Enhanced analytics and reporting capabilities
- **Integration APIs**: NHS Spine integration for patient data
- **Notification System**: Real-time alerts for critical care events

### 4. **Technical Improvements** (Priority: Medium)
- **Test Coverage**: Implement comprehensive test suite (Playwright configured)
- **Documentation**: API documentation and user guides
- **Code Quality**: Address TypeScript build errors (currently ignored)
- **Performance**: Database indexing and query optimization

### 5. **Operational Features** (Priority: Low)
- **Multi-language Support**: Internationalization for diverse care staff
- **Advanced Analytics**: Predictive analytics for care planning
- **Third-party Integrations**: Pharmacy and lab system integrations

## Development Commands

```bash
# Development
npm run dev --turbopack    # Start development server with Turbo

# Production
npm run build             # Build for production
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run typecheck        # Run TypeScript compiler (configure this)
```

## Critical Issues to Address

1. **Security**: The middleware.ts contains a security warning - implement proper authentication checks
2. **TypeScript**: Build errors are currently ignored - resolve type issues
3. **Environment**: Secure production environment configuration
4. **Documentation**: Update package.json name from "nextjs-starter" to "icare-home-management"
5. **Testing**: Implement comprehensive test coverage using configured Playwright

---

**Last Updated**: September 25, 2025
**Status**: Active Development
**Deployment**: Not Production Ready (Security Issues)