# Data Design & ERD - CareO

## 1. Entity Relationship Diagram (ERD)
The following Mermaid diagram visualizes the relationships between the core data entities in the Convex database.

```mermaid
erDiagram
    ORGANIZATION ||--o{ TEAM : "has"
    TEAM ||--o{ TEAM_MEMBER : "contains"
    USER ||--o{ TEAM_MEMBER : "belongs to"
    ORGANIZATION ||--o{ RESIDENT : "manages"
    RESIDENT ||--o{ MEDICATION : "prescribed"
    RESIDENT ||--o{ FOOD_FLUID_LOG : "consumed"
    RESIDENT ||--o{ PERSONAL_CARE_DAILY : "received"
    MEDICATION ||--o{ MEDICATION_INTAKE : "tracked by"
    RESIDENT ||--o{ INCIDENT : "involved in"
    USER ||--o{ MEDICATION_INTAKE : "administers"
    RESIDENT ||--o{ RESIDENT_AUDIT_LOG : "audited"

    ORGANIZATION {
        string name
        string slug
    }
    RESIDENT {
        id residentId
        string firstName
        string lastName
        date dateOfBirth
        string status
        id organizationId
    }
    MEDICATION {
        id medId
        string name
        string dosage
        string frequency
        boolean isControlled
    }
    MEDICATION_INTAKE {
        id intakeId
        timestamp scheduledTime
        string state
        id administratorUserId
        id witnessUserId
    }
```

## 2. Data Retention & Archival State Machine
Visualizing the UK healthcare compliance policy for Food & Fluid logs.

```mermaid
stateDiagram-v2
    [*] --> Active : Entry Created
    Active --> Archived : After 1 Year
    Archived --> ReadOnly : Locked for Compliance
    ReadOnly --> Deleted : After 7 Years (GDPR/UK Law)
    Deleted --> [*]

    note right of Active
        Editable by staff
    end note
    note right of Archived
        Automatic audit log entry
    end note
```

## 3. Storage Strategy
- **Relational Data**: Stored in Convex document tables with strong indexing on `organizationId` and `residentId`.
- **Files/Images**: Stored in Convex File Storage (`_storage`).
- **Audit Logs**: Append-only tables with high performance indexing for date-range queries.
