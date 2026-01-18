# Flow Diagrams - CareO

## 1. Resident Onboarding Flow
This lifecycle diagram shows how a resident is admitted into the system.

```mermaid
sequenceDiagram
    participant A as Admin/Manager
    participant F as Frontend (Onboarding Wizard)
    participant C as Convex (Backend)
    participant DB as Database

    A->>F: Enter Resident Basic Details
    F->>C: mutation: residents.create()
    C->>DB: Insert Resident Doc (isActive: true)
    C->>DB: Initialize Audit Log
    C-->>F: success(residentId)
    F->>A: Prompt for Risk Assessment
    A->>F: Complete Care File (Handling, Diet, Meds)
    F->>C: mutation: careFiles.save()
    C-->>F: Onboarding Complete
```

## 2. Medication Administration workflow
The critical path for administering medication, including controlled drug witnessing.

```mermaid
flowchart TD
    Start([Carer opens Med Round]) --> SelectResident[Select Resident]
    SelectResident --> ListMeds[List Scheduled Meds]
    ListMeds --> SelectMed[Select Medication]
    SelectMed --> Administer[Administer Dose]
    Administer --> Sign[Digital Signature (Current User)]
    Sign --> UpdateDB[Update Intake Status]
    UpdateDB --> CheckRefuse{Refused?}
    CheckRefuse -- Yes --> LogReason[Log Refusal Reason]
    CheckRefuse -- No --> Inventory[Decrement Stock]
    Inventory --> End([Round Complete])
```

## 3. Shift Handover Process
How information transitions between shifts.

```mermaid
graph LR
    ShiftAM[AM Shift Activities] --> Log[Continuous Logging]
    Log --> HandoverReport[Generate Handover Report]
    HandoverReport --> PeerReview[Incoming Shift Review]
    PeerReview --> ActionItems[Update Personal Care Tasks]
    ActionItems --> ShiftPM[PM Shift Start]
```
