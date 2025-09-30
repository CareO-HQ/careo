"use client";

import React from "react";

type AuditDetailPageProps = {
  params: Promise<{ id: string; itemId: string }>;
};

const auditItems = [
  "Care File – assessments, plans, reviews, consent",
  "Nutrition & Weight monitoring trends",
  "Wounds / Tissue Viability (≥ Grade 2 notifications)",
  "Falls – post-falls review + trend logging",
  "Restrictive Practices – oversight, reduction, resident-specific logs",
  "Medication administration errors/resident MAR chart audit",
  "Resident Experience – satisfaction surveys, meeting notes",
];

export default function AuditDetailPage({ params }: AuditDetailPageProps) {
  const { id, itemId } = React.use(params);

  // Find the actual audit name from the list
  const decodedItemId = decodeURIComponent(itemId);
  const auditName = auditItems.find(item => {
    const slug = item.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-');
    return slug === decodedItemId;
  }) || decodedItemId;

  return (
    <div className="w-full">
      <div className="flex flex-col mb-6">
        <p className="text-sm text-muted-foreground mb-2">
          Resident Audit
        </p>
        <h1 className="text-2xl font-bold">{auditName}</h1>
      </div>

      <div className="mt-6 p-6 border rounded-lg">
        <p className="text-muted-foreground">
          Audit details for <strong>{auditName}</strong> will be displayed here.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Resident ID: {id}
        </p>
      </div>
    </div>
  );
}
