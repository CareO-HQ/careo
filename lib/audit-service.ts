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

const isValidUUID = (uuid: string) => {
    if (!uuid) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
};

/** Care-home common action plans (participant visibility only; not audit-linked). */
export const CARE_HOME_COMMON_ACTION_PLANS_TABLE = "care_home_common_action_plans" as const;

function resolveActionPlanTableName(category: string): string {
    if (category === "common") {
        return CARE_HOME_COMMON_ACTION_PLANS_TABLE;
    }
    return `audit_${category === "carefile" ? "care_file" : category}_action_plans`;
}

async function fetchCareHomeCommonPlansForParticipant(params: {
    userId: string;
    email: string;
    organizationId?: string | null;
    careHomeId?: string | null;
}) {
    const { userId, email, organizationId, careHomeId } = params;
    if (!userId && !email) return [];

    const orParts: string[] = [];
    if (userId) {
        orParts.push(`assigned_to.eq.${userId}`, `created_by.eq.${userId}`);
    }
    if (email) {
        orParts.push(`assigned_to.eq.${email}`, `created_by.eq.${email}`);
    }
    const participantOr = orParts.join(",");

    try {
        let query = supabase
            .from(CARE_HOME_COMMON_ACTION_PLANS_TABLE)
            .select("*")
            .or(participantOr);
        if (organizationId) {
            query = query.eq("organization_id", organizationId);
        }
        if (careHomeId) {
            query = query.eq("care_home_id", careHomeId);
        }
        const { data, error } = await query;
        if (error || !data) return [];
        return data.map((p) => ({
            ...p,
            auditCategory: "common",
            actionPlanTable: CARE_HOME_COMMON_ACTION_PLANS_TABLE,
        }));
    } catch (err) {
        console.error("Error fetching care home common action plans:", err);
        return [];
    }
}

export type CareHomeCommonActionPlanInput = {
    description: string;
    priority: string;
    due_date: string;
    assigned_to: string;
    assigned_to_email: string;
    assigned_to_name?: string | null;
    organization_id: string;
    careHomeId: string;
    creatorId?: string | null;
    created_by?: string | null;
    created_by_name?: string | null;
};

export type CareFileActionPlanInput = {
    audit_response_id: string;
    description: string;
    priority: string;
    due_date?: string;
    assigned_to: string;
    assigned_to_email?: string | null;
    assigned_to_name?: string | null;
    organization_id?: string | null;
    careHomeId?: string | null;
    resident_id?: string | null;
    resident_name?: string | null;
    created_by?: string | null;
    created_by_name?: string | null;
    creatorId?: string | null;
    status?: string;
    source_item_id?: string;
};

export type ManagerActionPlanInput = {
    audit_type_id: string;
    description: string;
    priority: string;
    due_date: string;
    assigned_to: string;
    assigned_to_email?: string | null;
    assigned_to_name?: string | null;
    resident_id?: string | null;
    resident_name?: string | null;
    careHomeId?: string | null;
    organization_id: string;
    created_by?: string | null;
    created_by_name?: string | null;
    creatorId?: string | null;
    status?: string;
    source_item_id?: string | null;
};

function getTableNames(category: AuditCategory) {
    const suffix = category === 'carefile' ? 'care_file' : category;
    return {
        templates: `audit_${suffix}_templates` as const,
        completions: `audit_${suffix}_completions` as const,
        actionPlans: `audit_${suffix}_action_plans` as const
    };
}

async function getTemplates(category: AuditCategory, organizationId: string) {
    const tables = getTableNames(category);
    let query = supabase
        .from(tables.templates)
        .select('*')
        .eq('organization_id', organizationId);
    
    if (category === 'resident') {
        query = query.eq('category', 'resident');
    }
    
    const { data, error } = await query.eq('is_active', true);
    if (error) throw error;
    return data as AuditTemplate[];
}

async function getTemplateById(category: AuditCategory, id: string) {
    const tables = getTableNames(category);
    const { data, error } = await supabase
        .from(tables.templates)
        .select('*')
        .eq('id', id)
        .single();
    if (error) return null;
    return data as AuditTemplate;
}

async function updateTemplate(category: AuditCategory, id: string, updates: Partial<AuditTemplate>) {
    const tables = getTableNames(category);
    const { data, error } = await supabase
        .from(tables.templates)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data as AuditTemplate;
}

async function createTemplate(category: AuditCategory, template: Partial<AuditTemplate>) {
    const tables = getTableNames(category);
    const { data, error } = await supabase
        .from(tables.templates)
        .insert(template)
        .select()
        .single();
    if (error) throw error;
    return data as AuditTemplate;
}

async function deleteTemplate(category: AuditCategory, id: string) {
    const tables = getTableNames(category);
    const { error } = await supabase
        .from(tables.templates)
        .delete()
        .eq('id', id);
    if (error) throw error;
}

async function getLatestCompletions(category: AuditCategory, filterId: string) {
    const tables = getTableNames(category);
    const field = (category === 'resident' || category === 'carefile') ? 'team_id' : 'organization_id';
    const { data, error } = await supabase
        .from(tables.completions)
        .select('*')
        .eq(field, filterId);
    if (error) throw error;
    return data as AuditCompletion[];
}

async function getCompletionsByResident(residentId: string) {
    const { data, error } = await supabase
        .from('audit_care_file_completions')
        .select('*')
        .eq('resident_id', residentId);
    if (error) throw error;
    return data as AuditCompletion[];
}

async function getResponseById(category: AuditCategory, id: string) {
    const tables = getTableNames(category);
    const { data, error } = await supabase
        .from(tables.completions)
        .select('*')
        .eq('id', id)
        .single();
    if (error) return null;
    return data as AuditCompletion;
}

async function getDraftResponses(category: AuditCategory, templateId: string, scopeId: string) {
    const tables = getTableNames(category);
    let field = 'organization_id';
    if (category === 'resident') {
        field = 'team_id';
    } else if (category === 'carefile') {
        field = 'resident_id';
    }
    
    const { data, error } = await supabase
        .from(tables.completions)
        .select('*')
        .eq('template_id', templateId)
        .eq(field, scopeId)
        .in('status', ['draft', 'in-progress'])
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data as AuditCompletion[];
}

async function createResponse(category: AuditCategory, completion: Partial<AuditCompletion>) {
    const tables = getTableNames(category);
    const { data, error } = await supabase
        .from(tables.completions)
        .insert({ ...completion, status: completion.status || 'draft' })
        .select()
        .single();
    if (error) throw error;
    return data as AuditCompletion;
}

async function updateResponse(category: AuditCategory, id: string, updates: Partial<AuditCompletion>) {
    const tables = getTableNames(category);
    const { data, error } = await supabase
        .from(tables.completions)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data as AuditCompletion;
}

async function completeResponse(category: AuditCategory, id: string, updates: Partial<AuditCompletion>) {
    const tables = getTableNames(category);
    const completedAt = new Date().toISOString();
    let frequency = updates.frequency;

    if (!frequency) {
        const { data: existing } = await supabase
            .from(tables.completions)
            .select('frequency')
            .eq('id', id)
            .single();
        frequency = existing?.frequency;
    }

    const nextAuditDue = calculateNextDueDate(completedAt, frequency);

    const { data, error } = await supabase
        .from(tables.completions)
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
}

async function getActionPlans(category: AuditCategory, auditResponseId: string) {
    const tables = getTableNames(category);
    const { data, error } = await supabase
        .from(tables.actionPlans)
        .select('*')
        .eq('audit_response_id', auditResponseId);
    if (error) throw error;
    return data;
}

async function createActionPlan(category: AuditCategory, plan: any) {
    const tables = getTableNames(category);
    const { creatorId, careHomeId, ...dbPlan } = plan;
    const { data, error } = await supabase
        .from(tables.actionPlans)
        .insert({ 
            ...dbPlan, 
            status: dbPlan.status || 'pending',
            care_home_id: careHomeId ?? null 
        })
        .select()
        .single();
    if (error) throw error;

    // Create notification for assignee
    if (data && data.assigned_to && isValidUUID(data.assigned_to)) {
        supabase.from("notifications").insert({
            organization_id: data.organization_id,
            care_home_id: careHomeId || null,
            user_id: data.assigned_to,
            type: "action_plan",
            title: "New Action Plan Assigned",
            message: `You have been assigned a new action plan: ${data.description}`,
            link: `/dashboard/action-plans`,
            sender_id: dbPlan.created_by || creatorId || data.created_by || null,
            sender_name: data.created_by_name || "Manager",
            metadata: { actionPlanId: data.id, auditCategory: category }
        }).then(({ error }) => { if (error) console.error("Notification error:", error); });
    }

    return data;
}

async function deleteActionPlan(category: AuditCategory, id: string) {
    const tables = getTableNames(category);
    const { error } = await supabase
        .from(tables.actionPlans)
        .delete()
        .eq('id', id);
    if (error) throw error;
}

export const auditService = {
    // --- Resident Audits ---
    getResidentTemplates: (organizationId: string) => getTemplates('resident', organizationId),
    getResidentTemplateById: (id: string) => getTemplateById('resident', id),
    updateResidentTemplate: (id: string, updates: Partial<AuditTemplate>) => updateTemplate('resident', id, updates),
    createResidentTemplate: (template: Partial<AuditTemplate>) => createTemplate('resident', template),
    deleteResidentTemplate: (id: string) => deleteTemplate('resident', id),
    getLatestResidentCompletions: (teamId: string) => getLatestCompletions('resident', teamId),
    getResidentResponseById: (id: string) => getResponseById('resident', id),
    getDraftResidentResponses: (templateId: string, teamId: string) => getDraftResponses('resident', templateId, teamId),
    createResidentResponse: (completion: Partial<AuditCompletion>) => createResponse('resident', completion),
    updateResidentResponse: (id: string, updates: Partial<AuditCompletion>) => updateResponse('resident', id, updates),
    completeResidentResponse: (id: string, updates: Partial<AuditCompletion>) => completeResponse('resident', id, updates),
    getResidentActionPlans: (auditResponseId: string) => getActionPlans('resident', auditResponseId),
    createResidentActionPlan: (plan: any) => createActionPlan('resident', plan),
    deleteResidentActionPlan: (id: string) => deleteActionPlan('resident', id),

    // --- Care File Audits ---
    getCareFileTemplates: (organizationId: string) => getTemplates('carefile', organizationId),
    getCareFileTemplateById: (id: string) => getTemplateById('carefile', id),
    createCareFileTemplate: (template: Partial<AuditTemplate>) => createTemplate('carefile', template),
    updateCareFileTemplate: (id: string, updates: Partial<AuditTemplate>) => updateTemplate('carefile', id, updates),
    deleteCareFileTemplate: (id: string) => deleteTemplate('carefile', id),
    getLatestCareFileCompletions: (teamId: string) => getLatestCompletions('carefile', teamId),
    getCareFileCompletionsByResident: (residentId: string) => getCompletionsByResident(residentId),
    getCareFileResponseById: (id: string) => getResponseById('carefile', id),
    getDraftCareFileResponses: (templateId: string, residentId: string) => getDraftResponses('carefile', templateId, residentId),
    createCareFileResponse: (completion: Partial<AuditCompletion>) => createResponse('carefile', completion),
    updateCareFileResponse: (id: string, updates: Partial<AuditCompletion>) => updateResponse('carefile', id, updates),
    completeCareFileResponse: (id: string, updates: Partial<AuditCompletion>) => completeResponse('carefile', id, updates),
    getCareFileActionPlans: (auditResponseId: string) => getActionPlans('carefile', auditResponseId),
    createCareFileActionPlan: (plan: CareFileActionPlanInput) => createActionPlan('carefile', plan),
    deleteCareFileActionPlan: (id: string) => deleteActionPlan('carefile', id),

    // --- Governance Audits ---
    getGovernanceTemplates: (organizationId: string) => getTemplates('governance', organizationId),
    getGovernanceTemplateById: (id: string) => getTemplateById('governance', id),
    updateGovernanceTemplate: (id: string, updates: Partial<AuditTemplate>) => updateTemplate('governance', id, updates),
    createGovernanceTemplate: (template: Partial<AuditTemplate>) => createTemplate('governance', template),
    deleteGovernanceTemplate: (id: string) => deleteTemplate('governance', id),
    getLatestGovernanceCompletions: (organizationId: string) => getLatestCompletions('governance', organizationId),
    getGovernanceResponseById: (id: string) => getResponseById('governance', id),
    getDraftGovernanceResponses: (templateId: string, organizationId: string) => getDraftResponses('governance', templateId, organizationId),
    createGovernanceResponse: (completion: Partial<AuditCompletion>) => createResponse('governance', completion),
    updateGovernanceResponse: (id: string, updates: Partial<AuditCompletion>) => updateResponse('governance', id, updates),
    completeGovernanceResponse: (id: string, updates: Partial<AuditCompletion>) => completeResponse('governance', id, updates),
    getGovernanceActionPlans: (auditResponseId: string) => getActionPlans('governance', auditResponseId),
    createGovernanceActionPlan: (plan: any) => createActionPlan('governance', plan),
    deleteGovernanceActionPlan: (id: string) => deleteActionPlan('governance', id),

    // --- Clinical Audits ---
    getClinicalTemplates: (organizationId: string) => getTemplates('clinical', organizationId),
    getClinicalTemplateById: (id: string) => getTemplateById('clinical', id),
    updateClinicalTemplate: (id: string, updates: Partial<AuditTemplate>) => updateTemplate('clinical', id, updates),
    createClinicalTemplate: (template: Partial<AuditTemplate>) => createTemplate('clinical', template),
    deleteClinicalTemplate: (id: string) => deleteTemplate('clinical', id),
    getLatestClinicalCompletions: (organizationId: string) => getLatestCompletions('clinical', organizationId),
    getClinicalResponseById: (id: string) => getResponseById('clinical', id),
    getDraftClinicalResponses: (templateId: string, organizationId: string) => getDraftResponses('clinical', templateId, organizationId),
    createClinicalResponse: (completion: Partial<AuditCompletion>) => createResponse('clinical', completion),
    updateClinicalResponse: (id: string, updates: Partial<AuditCompletion>) => updateResponse('clinical', id, updates),
    completeClinicalResponse: (id: string, updates: Partial<AuditCompletion>) => completeResponse('clinical', id, updates),
    getClinicalActionPlans: (auditResponseId: string) => getActionPlans('clinical', auditResponseId),
    createClinicalActionPlan: (plan: any) => createActionPlan('clinical', plan),
    deleteClinicalActionPlan: (id: string) => deleteActionPlan('clinical', id),

    // --- Environment Audits ---
    getEnvironmentTemplates: (organizationId: string) => getTemplates('environment', organizationId),
    getEnvironmentTemplateById: (id: string) => getTemplateById('environment', id),
    updateEnvironmentTemplate: (id: string, updates: Partial<AuditTemplate>) => updateTemplate('environment', id, updates),
    createEnvironmentTemplate: (template: Partial<AuditTemplate>) => createTemplate('environment', template),
    deleteEnvironmentTemplate: (id: string) => deleteTemplate('environment', id),
    getLatestEnvironmentCompletions: (organizationId: string) => getLatestCompletions('environment', organizationId),
    getEnvironmentResponseById: (id: string) => getResponseById('environment', id),
    getDraftEnvironmentResponses: (templateId: string, organizationId: string) => getDraftResponses('environment', templateId, organizationId),
    createEnvironmentResponse: (completion: Partial<AuditCompletion>) => createResponse('environment', completion),
    updateEnvironmentResponse: (id: string, updates: Partial<AuditCompletion>) => updateResponse('environment', id, updates),
    completeEnvironmentResponse: (id: string, updates: Partial<AuditCompletion>) => completeResponse('environment', id, updates),
    getEnvironmentActionPlans: (auditResponseId: string) => getActionPlans('environment', auditResponseId),
    createEnvironmentActionPlan: (plan: any) => createActionPlan('environment', plan),
    deleteEnvironmentActionPlan: (id: string) => deleteActionPlan('environment', id),

    // --- Manager Audits ---

    async getManagerActionPlans(auditTypeId: string, careHomeId: string) {
        const { data, error } = await supabase
            .from('audit_manager_action_plans')
            .select('*')
            .eq('audit_type_id', auditTypeId)
            .eq('care_home_id', careHomeId);
        if (error) throw error;
        return data;
    },

    async createManagerActionPlan(plan: ManagerActionPlanInput) {
        const { creatorId, careHomeId, ...dbPlan } = plan;
        const { data, error } = await supabase
            .from('audit_manager_action_plans')
            .insert({ 
                ...dbPlan, 
                status: dbPlan.status || 'pending',
                care_home_id: careHomeId ?? null
            })
            .select()
            .single();
        if (error) throw error;

        // Create notification for assignee
        if (data && data.assigned_to && isValidUUID(data.assigned_to)) {
            supabase.from("notifications").insert({
                organization_id: data.organization_id,
                care_home_id: careHomeId || null,
                user_id: data.assigned_to,
                type: "action_plan",
                title: "New Action Plan Assigned",
                message: `You have been assigned a new action plan: ${data.description}`,
                link: `/dashboard/action-plans`,
                sender_id: data.created_by || creatorId || null,
                sender_name: data.created_by_name || "Manager",
                metadata: { actionPlanId: data.id, auditCategory: 'manager' }
            }).then(({ error }) => { if (error) console.error("Notification error:", error); });
        }

        return data;
    },

    async createCareHomeCommonActionPlan(plan: CareHomeCommonActionPlanInput) {
        const { creatorId, careHomeId, ...rest } = plan;
        const { data, error } = await supabase
            .from(CARE_HOME_COMMON_ACTION_PLANS_TABLE)
            .insert({
                organization_id: rest.organization_id,
                care_home_id: careHomeId,
                description: rest.description,
                priority: rest.priority,
                due_date: rest.due_date,
                assigned_to: rest.assigned_to,
                assigned_to_email: rest.assigned_to_email,
                assigned_to_name: rest.assigned_to_name?.trim() || null,
                status: "pending",
                created_by: rest.created_by ?? creatorId ?? null,
                created_by_name: rest.created_by_name ?? null,
            })
            .select()
            .single();
        if (error) throw error;

        if (data && data.assigned_to && isValidUUID(data.assigned_to)) {
            supabase.from("notifications").insert({
                organization_id: data.organization_id,
                care_home_id: careHomeId || null,
                user_id: data.assigned_to,
                type: "action_plan",
                title: "New Action Plan Assigned",
                message: `You have been assigned a new action plan: ${data.description}`,
                link: `/dashboard/action-plans`,
                sender_id: data.created_by || creatorId || null,
                sender_name: data.created_by_name || "Staff",
                metadata: { actionPlanId: data.id, auditCategory: "common" },
            }).then(({ error: notificationError }) => {
                if (notificationError) console.error("Notification error:", notificationError);
            });
        }

        return data;
    },

    async deleteManagerActionPlan(id: string) {
        const { error } = await supabase
            .from('audit_manager_action_plans')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // --- Global / Helper ---
    /** Staff list for pickers; kept org-shaped for callers but not filtered by DB column here — RLS already limits rows to who the viewer may see (same care home / org owner rules), and team-visible staff often have null active_organization_id. */
    async getOrganizationMembers(_organizationId: string) {
        const { data, error } = await supabase
            .from("users")
            .select("id, email, name, image_url, role");
        if (error) {
            console.warn("Could not fetch users:", error);
            return [];
        }
        return data;
    },

    async getCareHomeCommonActionPlansForParticipant(params: {
        userId: string;
        email: string;
        organizationId?: string | null;
        careHomeId?: string | null;
    }) {
        return fetchCareHomeCommonPlansForParticipant(params);
    },

    async getMyActionPlans(params: {
        userId: string;
        email: string;
        organizationId?: string | null;
        careHomeId?: string | null;
        /** When `care_assistant`, only participant rows from `care_home_common_action_plans` are returned (no audit plans). */
        role?: string | null;
    }) {
        const { userId, email, organizationId, careHomeId, role } = params;
        if (!userId && !email) return [];

        if (role === "care_assistant") {
            return fetchCareHomeCommonPlansForParticipant({
                userId,
                email,
                organizationId,
                careHomeId,
            });
        }

        const orParts: string[] = [];
        if (userId) {
            orParts.push(`assigned_to.eq.${userId}`, `created_by.eq.${userId}`);
        }
        if (email) {
            orParts.push(`assigned_to.eq.${email}`, `created_by.eq.${email}`);
        }
        const participantOr = orParts.join(",");

        const tables = [
            { name: "audit_resident_action_plans", category: "resident" },
            { name: "audit_care_file_action_plans", category: "carefile" },
            { name: "audit_governance_action_plans", category: "governance" },
            { name: "audit_clinical_action_plans", category: "clinical" },
            { name: "audit_environment_action_plans", category: "environment" },
            { name: "audit_manager_action_plans", category: "manager" },
        ];

        const allPlans: Record<string, unknown>[] = [];
        for (const table of tables) {
            try {
                let query = supabase.from(table.name).select("*").or(participantOr);
                if (organizationId) {
                    query = query.eq("organization_id", organizationId);
                }
                if (careHomeId) {
                    query = query.eq("care_home_id", careHomeId);
                }
                const { data, error } = await query;

                if (!error && data) {
                    allPlans.push(...data.map((p) => ({
                        ...p,
                        auditCategory: table.category,
                        actionPlanTable: table.name,
                    })));
                }
            } catch (err) {
                console.error(`Error fetching from ${table.name}:`, err);
            }
        }
        const commonPlans = await fetchCareHomeCommonPlansForParticipant({
            userId,
            email,
            organizationId,
            careHomeId,
        });
        allPlans.push(...commonPlans);
        return allPlans;
    },

    async getOrgActionPlans(organizationId: string) {
        const tables = [
            { name: 'audit_resident_action_plans', category: 'resident' },
            { name: 'audit_care_file_action_plans', category: 'carefile' },
            { name: 'audit_governance_action_plans', category: 'governance' },
            { name: 'audit_clinical_action_plans', category: 'clinical' },
            { name: 'audit_environment_action_plans', category: 'environment' },
            { name: 'audit_manager_action_plans', category: 'manager' }
        ];

        const allPlans: any[] = [];
        for (const table of tables) {
            try {
                const { data, error } = await supabase
                    .from(table.name)
                    .select('*')
                    .eq('organization_id', organizationId);

                if (!error && data) {
                    allPlans.push(...data.map(p => ({
                        ...p,
                        auditCategory: table.category,
                        actionPlanTable: table.name,
                    })));
                }
            } catch (err) {
                console.error(`Error fetching from ${table.name}:`, err);
            }
        }
        return allPlans;
    },

    async getCareHomeActionPlans(organizationId: string, careHomeId: string) {
        const tables = [
            { name: 'audit_resident_action_plans', category: 'resident' },
            { name: 'audit_care_file_action_plans', category: 'carefile' },
            { name: 'audit_governance_action_plans', category: 'governance' },
            { name: 'audit_clinical_action_plans', category: 'clinical' },
            { name: 'audit_environment_action_plans', category: 'environment' },
            { name: 'audit_manager_action_plans', category: 'manager' }
        ];

        const allPlans: any[] = [];
        for (const table of tables) {
            try {
                let query = supabase.from(table.name).select('*');
                query = query.eq('organization_id', organizationId);
                query = query.eq('care_home_id', careHomeId);
                
                const { data, error } = await query;

                if (!error && data) {
                    allPlans.push(...data.map(p => ({
                        ...p,
                        auditCategory: table.category,
                        actionPlanTable: table.name,
                    })));
                }
            } catch (err) {
                console.error(`Error fetching from ${table.name}:`, err);
            }
        }
        return allPlans;
    },

    async updateActionPlanStatus(category: string, planId: string, status: string, comment?: string, userId?: string, userName?: string) {
        const tableName = resolveActionPlanTableName(category);
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

        // Manager audit UI reads action_plans from manager_audit_state JSON; keep it in sync with DB.
        if (data && category === "manager" && data.audit_type_id && data.care_home_id) {
            try {
                const { data: stateRow } = await supabase
                    .from("manager_audit_state")
                    .select("action_plans")
                    .eq("care_home_id", data.care_home_id)
                    .eq("audit_type_id", data.audit_type_id)
                    .maybeSingle();
                if (stateRow?.action_plans && Array.isArray(stateRow.action_plans)) {
                    const nextPlans = (stateRow.action_plans as Record<string, unknown>[]).map((p) => {
                        if (String(p.id) !== String(data.id)) return p;
                        return {
                            ...p,
                            status: data.status,
                            ...(data.latest_comment != null && data.latest_comment !== ""
                                ? { latestComment: data.latest_comment }
                                : {}),
                        };
                    });
                    await supabase
                        .from("manager_audit_state")
                        .update({ action_plans: nextPlans })
                        .eq("care_home_id", data.care_home_id)
                        .eq("audit_type_id", data.audit_type_id);
                }
            } catch (e) {
                console.warn("manager_audit_state action_plans sync skipped:", e);
            }
        }

        // Create notification for managers/owners and assignee (participant-only for common plans)
        if (data) {
            const notificationTitle = `Action Plan ${status.replace('_', ' ')}`;
            const notificationMessage = `Action plan "${data.description}" marked as ${status.replace('_', ' ')} by ${userName || "Staff"}`;

            const members = await auditService.getOrganizationMembers(data.organization_id);

            const recipients =
                category === "common"
                    ? members.filter((member: { id: string }) => {
                          if (member.id === userId) return false;
                          return (
                              member.id === data.assigned_to || member.id === data.created_by
                          );
                      })
                    : members.filter((member: any) => {
                          if (member.id === userId) return false;
                          if (member.id === data.assigned_to) return true;
                          const memberRole = member.role || "";
                          return (
                              memberRole === "manager" ||
                              memberRole === "owner" ||
                              memberRole === "saas_admin" ||
                              memberRole === "admin"
                          );
                      });

            // Send to each recipient
            // Note: We can't batch insert easily with different user_ids efficiently for a small number, 
            // but we could map them. Supabase insert accepts an array.
            if (recipients.length > 0) {
                const notifications = recipients.map((member: any) => ({
                    organization_id: data.organization_id,
                    care_home_id: data.care_home_id ?? null,
                    user_id: member.id,
                    type: "action_plan_status",
                    title: notificationTitle,
                    message: notificationMessage,
                    link: `/dashboard/action-plans`,
                    sender_id: userId,
                    sender_name: userName,
                    metadata: {
                        actionPlanId: data.id,
                        status,
                        category,
                        auditCategory: category,
                    },
                }));

                const { error: notifError } = await supabase
                    .from("notifications")
                    .insert(notifications);

                if (notifError) console.error("Notification error:", notifError);
            }
        }

        return data;
    },

    async deleteActionPlan(category: string, planId: string) {
        const tableName = resolveActionPlanTableName(category);
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', planId);

        if (error) throw error;
    }
};
