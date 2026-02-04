import { supabase } from "@/lib/supabase";
import { addMonths, addYears } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export type AuditCategory = 'resident' | 'carefile' | 'governance' | 'clinical' | 'environment';
const UK_TIMEZONE = 'Europe/London';

// Template Interfaces
export interface AuditTemplate {
    id: string;
    name: string;
    description?: string;
    category: AuditCategory;
    questions?: any[]; // JSONB
    items?: any[]; // JSONB
    frequency?: string;
    is_active: boolean;
    team_id?: string;
    organization_id: string;
    created_by: string;
    created_at: string;
    updated_at: string;
}

// Completion Interfaces
export interface AuditCompletion {
    id: string;
    template_id: string;
    template_name?: string;
    category?: string;
    team_id?: string;
    resident_id?: string; // Important for Care File audits
    organization_id: string;
    responses?: any[]; // JSONB
    items?: any[]; // JSONB
    overall_notes?: string;
    status: 'draft' | 'in-progress' | 'completed';
    audited_by?: string;
    audited_by_name?: string;
    audited_at: string;
    completed_at?: string;
    frequency?: string;
    next_audit_due?: string;
    created_at: string;
    updated_at: string;
}

const calculateNextDueDate = (completedAt: string | Date, frequency?: string): string | null => {
    if (!frequency) return null;

    // Convert to UK time to ensure adding months/years follows UK day boundaries
    const date = toZonedTime(new Date(completedAt), UK_TIMEZONE);
    const freq = frequency.toLowerCase();

    let nextDate: Date;
    switch (freq) {
        case 'monthly':
            nextDate = addMonths(date, 1);
            break;
        case 'quarterly':
            nextDate = addMonths(date, 3);
            break;
        case 'yearly':
            nextDate = addYears(date, 1);
            break;
        default:
            return null;
    }

    return nextDate.toISOString();
};

export const auditService = {
    // --- Resident Audits ---

    async getResidentTemplates(organizationId: string) {
        const { data, error } = await supabase
            .from('audit_resident_templates')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('category', 'resident')
            .eq('is_active', true);
        if (error) throw error;
        return data as AuditTemplate[];
    },

    async getResidentTemplateById(id: string) {
        const { data, error } = await supabase
            .from('audit_resident_templates')
            .select('*')
            .eq('id', id)
            .single();
        if (error) return null;
        return data as AuditTemplate;
    },

    async updateResidentTemplate(id: string, updates: Partial<AuditTemplate>) {
        const { data, error } = await supabase
            .from('audit_resident_templates')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as AuditTemplate;
    },

    async createResidentTemplate(template: Partial<AuditTemplate>) {
        const { data, error } = await supabase
            .from('audit_resident_templates')
            .insert(template)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteResidentTemplate(id: string) {
        const { error } = await supabase
            .from('audit_resident_templates')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    async getLatestResidentCompletions(teamId: string) {
        const { data, error } = await supabase
            .from('audit_resident_completions')
            .select('*')
            .eq('team_id', teamId);
        if (error) throw error;
        return data as AuditCompletion[];
    },

    async getResidentResponseById(id: string) {
        const { data, error } = await supabase
            .from('audit_resident_completions')
            .select('*')
            .eq('id', id)
            .single();
        if (error) return null;
        return data as AuditCompletion;
    },

    async getDraftResidentResponses(templateId: string, teamId: string) {
        const { data, error } = await supabase
            .from('audit_resident_completions')
            .select('*')
            .eq('template_id', templateId)
            .eq('team_id', teamId)
            .in('status', ['draft', 'in-progress'])
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data as AuditCompletion[];
    },

    async createResidentResponse(completion: Partial<AuditCompletion>) {
        const { data, error } = await supabase
            .from('audit_resident_completions')
            .insert({ ...completion, status: completion.status || 'draft' })
            .select()
            .single();
        if (error) throw error;
        return data as AuditCompletion;
    },

    async updateResidentResponse(id: string, updates: Partial<AuditCompletion>) {
        const { data, error } = await supabase
            .from('audit_resident_completions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as AuditCompletion;
    },

    async completeResidentResponse(id: string, updates: Partial<AuditCompletion>) {
        const completedAt = new Date().toISOString();
        let frequency = updates.frequency;

        if (!frequency) {
            const { data: existing } = await supabase
                .from('audit_resident_completions')
                .select('frequency')
                .eq('id', id)
                .single();
            frequency = existing?.frequency;
        }

        const nextAuditDue = calculateNextDueDate(completedAt, frequency);

        const { data, error } = await supabase
            .from('audit_resident_completions')
            .update({
                ...updates,
                status: 'completed',
                completed_at: completedAt,
                next_audit_due: nextAuditDue
            })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as AuditCompletion;
    },

    async getResidentActionPlans(auditResponseId: string) {
        const { data, error } = await supabase
            .from('audit_resident_action_plans')
            .select('*')
            .eq('audit_response_id', auditResponseId);
        if (error) throw error;
        return data;
    },

    async createResidentActionPlan(plan: any) {
        const { creatorId, ...dbPlan } = plan;
        const { data, error } = await supabase
            .from('audit_resident_action_plans')
            .insert({ ...dbPlan, status: dbPlan.status || 'pending' })
            .select()
            .single();
        if (error) throw error;

        // Create notification for assignee
        if (data && data.assigned_to) {
            supabase.from("notifications").insert({
                organization_id: data.organization_id,
                user_id: data.assigned_to,
                type: "action_plan",
                title: "New Action Plan Assigned",
                message: `You have been assigned a new action plan: ${data.description}`,
                link: `/dashboard/action-plans`,
                sender_id: creatorId || null,
                sender_name: data.created_by_name || "Manager",
                metadata: { actionPlanId: data.id, auditCategory: 'resident' }
            }).then(({ error }) => { if (error) console.error("Notification error:", error); });
        }

        return data;
    },

    async deleteResidentActionPlan(id: string) {
        const { error } = await supabase
            .from('audit_resident_action_plans')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // --- Care File Audits ---

    async getCareFileTemplates(organizationId: string) {
        const { data, error } = await supabase
            .from('audit_care_file_templates')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('is_active', true);
        if (error) throw error;
        return data as AuditTemplate[];
    },

    async getCareFileTemplateById(id: string) {
        const { data, error } = await supabase
            .from('audit_care_file_templates')
            .select('*')
            .eq('id', id)
            .single();
        if (error) return null;
        return data as AuditTemplate;
    },

    async createCareFileTemplate(template: Partial<AuditTemplate>) {
        const { data, error } = await supabase
            .from('audit_care_file_templates')
            .insert(template)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateCareFileTemplate(id: string, updates: Partial<AuditTemplate>) {
        const { data, error } = await supabase
            .from('audit_care_file_templates')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as AuditTemplate;
    },

    async deleteCareFileTemplate(id: string) {
        const { error } = await supabase
            .from('audit_care_file_templates')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    async getLatestCareFileCompletions(teamId: string) {
        const { data, error } = await supabase
            .from('audit_care_file_completions')
            .select('*')
            .eq('team_id', teamId);
        if (error) throw error;
        return data as AuditCompletion[];
    },

    async getCareFileCompletionsByResident(residentId: string) {
        const { data, error } = await supabase
            .from('audit_care_file_completions')
            .select('*')
            .eq('resident_id', residentId);
        if (error) throw error;
        return data as AuditCompletion[];
    },

    async getCareFileResponseById(id: string) {
        const { data, error } = await supabase
            .from('audit_care_file_completions')
            .select('*')
            .eq('id', id)
            .single();
        if (error) return null;
        return data as AuditCompletion;
    },

    async getDraftCareFileResponses(templateId: string, residentId: string) {
        const { data, error } = await supabase
            .from('audit_care_file_completions')
            .select('*')
            .eq('template_id', templateId)
            .eq('resident_id', residentId)
            .in('status', ['draft', 'in-progress'])
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data as AuditCompletion[];
    },

    async createCareFileResponse(completion: Partial<AuditCompletion>) {
        const { data, error } = await supabase
            .from('audit_care_file_completions')
            .insert({ ...completion, status: completion.status || 'draft' })
            .select()
            .single();
        if (error) throw error;
        return data as AuditCompletion;
    },

    async updateCareFileResponse(id: string, updates: Partial<AuditCompletion>) {
        const { data, error } = await supabase
            .from('audit_care_file_completions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as AuditCompletion;
    },

    async completeCareFileResponse(id: string, updates: Partial<AuditCompletion>) {
        const completedAt = new Date().toISOString();
        let frequency = updates.frequency;

        if (!frequency) {
            const { data: existing } = await supabase
                .from('audit_care_file_completions')
                .select('frequency')
                .eq('id', id)
                .single();
            frequency = existing?.frequency;
        }

        const nextAuditDue = calculateNextDueDate(completedAt, frequency);

        const { data, error } = await supabase
            .from('audit_care_file_completions')
            .update({
                ...updates,
                status: 'completed',
                completed_at: completedAt,
                next_audit_due: nextAuditDue
            })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as AuditCompletion;
    },

    async getCareFileActionPlans(auditResponseId: string) {
        const { data, error } = await supabase
            .from('audit_care_file_action_plans')
            .select('*')
            .eq('audit_response_id', auditResponseId);
        if (error) throw error;
        return data;
    },

    async createCareFileActionPlan(plan: any) {
        const { creatorId, ...dbPlan } = plan;
        const { data, error } = await supabase
            .from('audit_care_file_action_plans')
            .insert({ ...dbPlan, status: dbPlan.status || 'pending' })
            .select()
            .single();
        if (error) throw error;

        // Create notification for assignee
        if (data && data.assigned_to) {
            supabase.from("notifications").insert({
                organization_id: data.organization_id,
                user_id: data.assigned_to,
                type: "action_plan",
                title: "New Action Plan Assigned",
                message: `You have been assigned a new action plan: ${data.description}`,
                link: `/dashboard/action-plans`,
                sender_id: creatorId || null,
                sender_name: data.created_by_name || "Manager",
                metadata: { actionPlanId: data.id, auditCategory: 'carefile' }
            }).then(({ error }) => { if (error) console.error("Notification error:", error); });
        }

        return data;
    },

    async deleteCareFileActionPlan(id: string) {
        const { error } = await supabase
            .from('audit_care_file_action_plans')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // --- Governance Audits ---

    async getGovernanceTemplates(organizationId: string) {
        const { data, error } = await supabase
            .from('audit_governance_templates')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('is_active', true);
        if (error) throw error;
        return data as AuditTemplate[];
    },

    async getGovernanceTemplateById(id: string) {
        const { data, error } = await supabase
            .from('audit_governance_templates')
            .select('*')
            .eq('id', id)
            .single();
        if (error) return null;
        return data as AuditTemplate;
    },

    async updateGovernanceTemplate(id: string, updates: Partial<AuditTemplate>) {
        const { data, error } = await supabase
            .from('audit_governance_templates')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as AuditTemplate;
    },

    async createGovernanceTemplate(template: Partial<AuditTemplate>) {
        const { data, error } = await supabase
            .from('audit_governance_templates')
            .insert(template)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteGovernanceTemplate(id: string) {
        const { error } = await supabase
            .from('audit_governance_templates')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    async getLatestGovernanceCompletions(organizationId: string) {
        const { data, error } = await supabase
            .from('audit_governance_completions')
            .select('*')
            .eq('organization_id', organizationId);
        if (error) throw error;
        return data as AuditCompletion[];
    },

    async getGovernanceResponseById(id: string) {
        const { data, error } = await supabase
            .from('audit_governance_completions')
            .select('*')
            .eq('id', id)
            .single();
        if (error) return null;
        return data as AuditCompletion;
    },

    async getDraftGovernanceResponses(templateId: string, organizationId: string) {
        const { data, error } = await supabase
            .from('audit_governance_completions')
            .select('*')
            .eq('template_id', templateId)
            .eq('organization_id', organizationId)
            .in('status', ['draft', 'in-progress'])
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data as AuditCompletion[];
    },

    async createGovernanceResponse(completion: Partial<AuditCompletion>) {
        const { data, error } = await supabase
            .from('audit_governance_completions')
            .insert({ ...completion, status: completion.status || 'draft' })
            .select()
            .single();
        if (error) throw error;
        return data as AuditCompletion;
    },

    async updateGovernanceResponse(id: string, updates: Partial<AuditCompletion>) {
        const { data, error } = await supabase
            .from('audit_governance_completions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as AuditCompletion;
    },

    async completeGovernanceResponse(id: string, updates: Partial<AuditCompletion>) {
        const completedAt = new Date().toISOString();
        let frequency = updates.frequency;

        if (!frequency) {
            const { data: existing } = await supabase
                .from('audit_governance_completions')
                .select('frequency')
                .eq('id', id)
                .single();
            frequency = existing?.frequency;
        }

        const nextAuditDue = calculateNextDueDate(completedAt, frequency);

        const { data, error } = await supabase
            .from('audit_governance_completions')
            .update({
                ...updates,
                status: 'completed',
                completed_at: completedAt,
                next_audit_due: nextAuditDue
            })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as AuditCompletion;
    },

    async getGovernanceActionPlans(auditResponseId: string) {
        const { data, error } = await supabase
            .from('audit_governance_action_plans')
            .select('*')
            .eq('audit_response_id', auditResponseId);
        if (error) throw error;
        return data;
    },

    async createGovernanceActionPlan(plan: any) {
        const { creatorId, ...dbPlan } = plan;
        const { data, error } = await supabase
            .from('audit_governance_action_plans')
            .insert({ ...dbPlan, status: dbPlan.status || 'pending' })
            .select()
            .single();
        if (error) throw error;

        // Create notification for assignee
        if (data && data.assigned_to) {
            supabase.from("notifications").insert({
                organization_id: data.organization_id,
                user_id: data.assigned_to,
                type: "action_plan",
                title: "New Action Plan Assigned",
                message: `You have been assigned a new action plan: ${data.description}`,
                link: `/dashboard/action-plans`,
                sender_id: creatorId || null,
                sender_name: data.created_by_name || "Manager",
                metadata: { actionPlanId: data.id, auditCategory: 'governance' }
            }).then(({ error }) => { if (error) console.error("Notification error:", error); });
        }

        return data;
    },

    async deleteGovernanceActionPlan(id: string) {
        const { error } = await supabase
            .from('audit_governance_action_plans')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // --- Clinical Audits ---

    async getClinicalTemplates(organizationId: string) {
        const { data, error } = await supabase
            .from('audit_clinical_templates')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('is_active', true);
        if (error) throw error;
        return data as AuditTemplate[];
    },

    async getClinicalTemplateById(id: string) {
        const { data, error } = await supabase
            .from('audit_clinical_templates')
            .select('*')
            .eq('id', id)
            .single();
        if (error) return null;
        return data as AuditTemplate;
    },

    async updateClinicalTemplate(id: string, updates: Partial<AuditTemplate>) {
        const { data, error } = await supabase
            .from('audit_clinical_templates')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as AuditTemplate;
    },

    async createClinicalTemplate(template: Partial<AuditTemplate>) {
        const { data, error } = await supabase
            .from('audit_clinical_templates')
            .insert(template)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteClinicalTemplate(id: string) {
        const { error } = await supabase
            .from('audit_clinical_templates')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    async getLatestClinicalCompletions(organizationId: string) {
        const { data, error } = await supabase
            .from('audit_clinical_completions')
            .select('*')
            .eq('organization_id', organizationId);
        if (error) throw error;
        return data as AuditCompletion[];
    },

    async getClinicalResponseById(id: string) {
        const { data, error } = await supabase
            .from('audit_clinical_completions')
            .select('*')
            .eq('id', id)
            .single();
        if (error) return null;
        return data as AuditCompletion;
    },

    async getDraftClinicalResponses(templateId: string, organizationId: string) {
        const { data, error } = await supabase
            .from('audit_clinical_completions')
            .select('*')
            .eq('template_id', templateId)
            .eq('organization_id', organizationId)
            .in('status', ['draft', 'in-progress'])
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data as AuditCompletion[];
    },

    async createClinicalResponse(completion: Partial<AuditCompletion>) {
        const { data, error } = await supabase
            .from('audit_clinical_completions')
            .insert({ ...completion, status: completion.status || 'draft' })
            .select()
            .single();
        if (error) throw error;
        return data as AuditCompletion;
    },

    async updateClinicalResponse(id: string, updates: Partial<AuditCompletion>) {
        const { data, error } = await supabase
            .from('audit_clinical_completions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as AuditCompletion;
    },

    async completeClinicalResponse(id: string, updates: Partial<AuditCompletion>) {
        const completedAt = new Date().toISOString();
        let frequency = updates.frequency;

        if (!frequency) {
            const { data: existing } = await supabase
                .from('audit_clinical_completions')
                .select('frequency')
                .eq('id', id)
                .single();
            frequency = existing?.frequency;
        }

        const nextAuditDue = calculateNextDueDate(completedAt, frequency);

        const { data, error } = await supabase
            .from('audit_clinical_completions')
            .update({
                ...updates,
                status: 'completed',
                completed_at: completedAt,
                next_audit_due: nextAuditDue
            })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as AuditCompletion;
    },

    async getClinicalActionPlans(auditResponseId: string) {
        const { data, error } = await supabase
            .from('audit_clinical_action_plans')
            .select('*')
            .eq('audit_response_id', auditResponseId);
        if (error) throw error;
        return data;
    },

    async createClinicalActionPlan(plan: any) {
        const { data, error } = await supabase
            .from('audit_clinical_action_plans')
            .insert({ ...plan, status: plan.status || 'pending' })
            .select()
            .single();
        if (error) throw error;

        // Create notification for assignee
        if (data && data.assigned_to) {
            supabase.from("notifications").insert({
                organization_id: data.organization_id,
                user_id: data.assigned_to,
                type: "action_plan",
                title: "New Action Plan Assigned",
                message: `You have been assigned a new action plan: ${data.description}`,
                link: `/dashboard/action-plans`,
                sender_id: data.created_by,
                sender_name: data.created_by_name || "Manager",
                metadata: { actionPlanId: data.id, auditCategory: 'clinical' }
            }).then(({ error }) => { if (error) console.error("Notification error:", error); });
        }

        return data;
    },

    async deleteClinicalActionPlan(id: string) {
        const { error } = await supabase
            .from('audit_clinical_action_plans')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // --- Environment Audits ---

    async getEnvironmentTemplates(organizationId: string) {
        const { data, error } = await supabase
            .from('audit_environment_templates')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('is_active', true);
        if (error) throw error;
        return data as AuditTemplate[];
    },

    async getEnvironmentTemplateById(id: string) {
        const { data, error } = await supabase
            .from('audit_environment_templates')
            .select('*')
            .eq('id', id)
            .single();
        if (error) return null;
        return data as AuditTemplate;
    },

    async updateEnvironmentTemplate(id: string, updates: Partial<AuditTemplate>) {
        const { data, error } = await supabase
            .from('audit_environment_templates')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as AuditTemplate;
    },

    async createEnvironmentTemplate(template: Partial<AuditTemplate>) {
        const { data, error } = await supabase
            .from('audit_environment_templates')
            .insert(template)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteEnvironmentTemplate(id: string) {
        const { error } = await supabase
            .from('audit_environment_templates')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    async getLatestEnvironmentCompletions(organizationId: string) {
        const { data, error } = await supabase
            .from('audit_environment_completions')
            .select('*')
            .eq('organization_id', organizationId);
        if (error) throw error;
        return data as AuditCompletion[];
    },

    async getEnvironmentResponseById(id: string) {
        const { data, error } = await supabase
            .from('audit_environment_completions')
            .select('*')
            .eq('id', id)
            .single();
        if (error) return null;
        return data as AuditCompletion;
    },

    async getDraftEnvironmentResponses(templateId: string, organizationId: string) {
        const { data, error } = await supabase
            .from('audit_environment_completions')
            .select('*')
            .eq('template_id', templateId)
            .eq('organization_id', organizationId)
            .in('status', ['draft', 'in-progress'])
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data as AuditCompletion[];
    },

    async createEnvironmentResponse(completion: Partial<AuditCompletion>) {
        const { data, error } = await supabase
            .from('audit_environment_completions')
            .insert({ ...completion, status: completion.status || 'draft' })
            .select()
            .single();
        if (error) throw error;
        return data as AuditCompletion;
    },

    async updateEnvironmentResponse(id: string, updates: Partial<AuditCompletion>) {
        const { data, error } = await supabase
            .from('audit_environment_completions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as AuditCompletion;
    },

    async completeEnvironmentResponse(id: string, updates: Partial<AuditCompletion>) {
        const completedAt = new Date().toISOString();
        let frequency = updates.frequency;

        if (!frequency) {
            const { data: existing } = await supabase
                .from('audit_environment_completions')
                .select('frequency')
                .eq('id', id)
                .single();
            frequency = existing?.frequency;
        }

        const nextAuditDue = calculateNextDueDate(completedAt, frequency);

        const { data, error } = await supabase
            .from('audit_environment_completions')
            .update({
                ...updates,
                status: 'completed',
                completed_at: completedAt,
                next_audit_due: nextAuditDue
            })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as AuditCompletion;
    },

    async getEnvironmentActionPlans(auditResponseId: string) {
        const { data, error } = await supabase
            .from('audit_environment_action_plans')
            .select('*')
            .eq('audit_response_id', auditResponseId);
        if (error) throw error;
        return data;
    },

    async createEnvironmentActionPlan(plan: any) {
        const { data, error } = await supabase
            .from('audit_environment_action_plans')
            .insert({ ...plan, status: plan.status || 'pending' })
            .select()
            .single();
        if (error) throw error;

        // Create notification for assignee
        if (data && data.assigned_to) {
            supabase.from("notifications").insert({
                organization_id: data.organization_id,
                user_id: data.assigned_to,
                type: "action_plan",
                title: "New Action Plan Assigned",
                message: `You have been assigned a new action plan: ${data.description}`,
                link: `/dashboard/action-plans`,
                sender_id: data.created_by,
                sender_name: data.created_by_name || "Manager",
                metadata: { actionPlanId: data.id, auditCategory: 'environment' }
            }).then(({ error }) => { if (error) console.error("Notification error:", error); });
        }

        return data;
    },

    async deleteEnvironmentActionPlan(id: string) {
        const { error } = await supabase
            .from('audit_environment_action_plans')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // --- Global / Helper ---
    async getOrganizationMembers(organizationId: string) {
        const { data, error } = await supabase
            .from('users')
            .select('id, email, name, image_url')
            .eq('active_organization_id', organizationId);
        if (error) {
            console.warn("Could not fetch users:", error);
            return [];
        }
        return data;
    },

    async getMyActionPlans(email: string) {
        const tables = [
            { name: 'audit_resident_action_plans', category: 'resident' },
            { name: 'audit_care_file_action_plans', category: 'carefile' },
            { name: 'audit_governance_action_plans', category: 'governance' },
            { name: 'audit_clinical_action_plans', category: 'clinical' },
            { name: 'audit_environment_action_plans', category: 'environment' }
        ];

        const allPlans: any[] = [];
        for (const table of tables) {
            try {
                const { data, error } = await supabase
                    .from(table.name)
                    .select('*')
                    .or(`assigned_to.eq.${email},created_by.eq.${email}`);

                if (!error && data) {
                    allPlans.push(...data.map(p => ({ ...p, auditCategory: table.category })));
                }
            } catch (err) {
                console.error(`Error fetching from ${table.name}:`, err);
            }
        }
        return allPlans;
    },

    async getOrgActionPlans(organizationId: string) {
        const tables = [
            { name: 'audit_resident_action_plans', category: 'resident' },
            { name: 'audit_care_file_action_plans', category: 'carefile' },
            { name: 'audit_governance_action_plans', category: 'governance' },
            { name: 'audit_clinical_action_plans', category: 'clinical' },
            { name: 'audit_environment_action_plans', category: 'environment' }
        ];

        const allPlans: any[] = [];
        for (const table of tables) {
            try {
                const { data, error } = await supabase
                    .from(table.name)
                    .select('*')
                    .eq('organization_id', organizationId);

                if (!error && data) {
                    allPlans.push(...data.map(p => ({ ...p, auditCategory: table.category })));
                }
            } catch (err) {
                console.error(`Error fetching from ${table.name}:`, err);
            }
        }
        return allPlans;
    },

    async updateActionPlanStatus(category: string, planId: string, status: string, comment?: string, userId?: string, userName?: string) {
        const tableName = `audit_${category === 'carefile' ? 'care_file' : category}_action_plans`;
        const { data, error } = await supabase
            .from(tableName)
            .update({
                status: status as any,
                latest_comment: comment,
                updated_at: new Date().toISOString()
            })
            .eq('id', planId)
            .select()
            .single();

        if (error) throw error;

        // Create notification for managers/owners
        if (data) {
            // Check if status is completed or in_progress to notify the creator
            const notificationTitle = `Action Plan ${status.replace('_', ' ')}`;
            const notificationMessage = `Action plan "${data.description}" marked as ${status.replace('_', ' ')} by ${userName || "Staff"}`;

            supabase.from("notifications").insert({
                organization_id: data.organization_id,
                user_id: null, // Broadcast to managers of the org
                type: "action_plan_status",
                title: notificationTitle,
                message: notificationMessage,
                link: `/dashboard/action-plans`,
                sender_id: userId,
                sender_name: userName,
                metadata: { actionPlanId: data.id, status, category }
            }).then(({ error }) => { if (error) console.error("Notification error:", error); });
        }

        return data;
    },

    async deleteActionPlan(category: string, planId: string) {
        const tableName = `audit_${category === 'carefile' ? 'care_file' : category}_action_plans`;
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', planId);

        if (error) throw error;
    }
};
