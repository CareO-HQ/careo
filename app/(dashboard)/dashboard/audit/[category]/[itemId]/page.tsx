"use client";

import React from "react";

type AuditDetailPageProps = {
  params: Promise<{ category: string; itemId: string }>;
};

const auditItemsMap: Record<string, string[]> = {
  governance: [
    "Reg 29 Monthly Monitoring Visit & Action Plan",
    "Annual Governance/Quality Report",
    "Reg 30 Notifiable Events compliance",
    "Complaints – trend analysis & learning",
    "Incidents/Near Misses – trend analysis & learning",
    "Safeguarding – ASC annual position report & training coverage",
    "Service User / Relative Feedback – surveys, meetings, forums",
    "Staff Training / Supervision audit",
    "Policies & Procedures compliance",
  ],
  clinical: [
    "Medicines Management (overall, including CD balance checks)",
    "Infection Prevention & Control – hand hygiene, environment, PPE, decontamination",
    "Mattress Supervision / Integrity audits",
  ],
  environment: [
    "Fire Safety – FRA, drills, PEEPs, alarm & emergency lighting testing",
    "Legionella – risk assessment, flushing, temperatures, descaling, logs",
    "LOLER – hoists/slings servicing (6-monthly thorough examination)",
    "Medical Devices – servicing, decontamination, incident logs",
    "Electrical Safety – EICR, PAT (risk-based)",
    "Gas Safety – annual Gas Safe certificates",
    "Food Safety – HACCP system, temps, cleaning, allergens, diary verification",
  ],
};

export default function AuditDetailPage({ params }: AuditDetailPageProps) {
  const { category, itemId } = React.use(params);

  // Find the actual audit name from the map
  const decodedItemId = decodeURIComponent(itemId);
  const categoryItems = auditItemsMap[category] || [];

  const auditName = categoryItems.find(item => {
    const slug = item.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-');
    return slug === decodedItemId;
  }) || decodedItemId;

  const categoryName = category === 'governance'
    ? 'Governance & Compliance'
    : category === 'clinical'
    ? 'Clinical Care & Medicines'
    : 'Environment & Safety';

  return (
    <div className="w-full">
      <div className="flex flex-col mb-6">
        <p className="text-sm text-muted-foreground mb-2">
          {categoryName}
        </p>
        <h1 className="text-2xl font-bold">{auditName}</h1>
      </div>

      <div className="mt-6 p-6 border rounded-lg">
        <p className="text-muted-foreground">
          Audit details for <strong>{auditName}</strong> will be displayed here.
        </p>
      </div>
    </div>
  );
}
