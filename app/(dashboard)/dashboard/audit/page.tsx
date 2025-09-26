"use client";

import { AuditDataTable } from "./audit-data-table";
import { mockAuditData } from "./mock-data";
import { ActionPlanFormData, AuditItem } from "./types";
import { useState } from "react";
import { toast } from "sonner";

export default function AuditPage() {
  const [auditData, setAuditData] = useState(mockAuditData);

  const handleActionPlanSubmit = (item: AuditItem, data: ActionPlanFormData) => {
    setAuditData((prevData) =>
      prevData.map((auditItem) =>
        auditItem.id === item.id
          ? {
              ...auditItem,
              followUpNote: data.followUpNote,
              assignedTo: data.assignTo,
              priority: data.priority,
              dueDate: data.dueDate,
              status: data.status,
              updatedDate: new Date()
            }
          : auditItem
      )
    );
    
    toast.success("Issue updated successfully", {
      description: `Updated issue for ${item.title}`
    });
  };

  const handleStatusChange = (itemId: string, newStatus: AuditItem["status"]) => {
    setAuditData((prevData) =>
      prevData.map((auditItem) =>
        auditItem.id === itemId
          ? {
              ...auditItem,
              status: newStatus,
              updatedDate: new Date()
            }
          : auditItem
      )
    );
    
    toast.success("Status updated successfully", {
      description: `Status changed to ${newStatus.replace(/_/g, " ")}`
    });
  };

  const handleAssigneeChange = (itemId: string, assignedTo: string) => {
    setAuditData((prevData) =>
      prevData.map((auditItem) =>
        auditItem.id === itemId
          ? {
              ...auditItem,
              assignedTo: assignedTo || undefined,
              updatedDate: new Date()
            }
          : auditItem
      )
    );
    
    toast.success("Assignment updated successfully", {
      description: assignedTo 
        ? `Assigned to ${assignedTo}` 
        : "Assignment removed"
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit</h1>
        <p className="text-muted-foreground mt-2">
          Manage and track Care Plans, Risk Assessments, and Incident Reports
        </p>
      </div>
      
      <AuditDataTable 
        data={auditData} 
        onActionPlanSubmit={handleActionPlanSubmit}
        onStatusChange={handleStatusChange}
        onAssigneeChange={handleAssigneeChange}
      />
    </div>
  );
}