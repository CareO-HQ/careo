"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";

const UK_TIMEZONE = "Europe/London";

interface CarePlanEvaluationsProps {
    carePlanId: string;
    residentId: string;
}

export function CarePlanEvaluations({ carePlanId, residentId }: CarePlanEvaluationsProps) {
    const { profile } = useProfile();
    const [evaluations, setEvaluations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [comments, setComments] = useState("");
    const [evalTime, setEvalTime] = useState("");
    const [outcome, setOutcome] = useState("Reviewed Remain Valid");
    const [position, setPosition] = useState("");
    const [nextReviewDate, setNextReviewDate] = useState<string>("");

    const generateTimeOptions = () => {
        const options: string[] = [];
        for (let i = 0; i < 24; i++) {
            for (let j = 0; j < 60; j += 5) {
                const hour = i.toString().padStart(2, '0');
                const minute = j.toString().padStart(2, '0');
                options.push(`${hour}:${minute}`);
            }
        }
        return options;
    };

    const fetchEvaluations = async () => {
        if (!carePlanId) return;
        try {
            const { data, error: fetchError } = await supabase
                .from('care_plan_evaluations')
                .select('*')
                .eq('care_plan_id', carePlanId)
                .order('created_at', { ascending: false });

            if (fetchError) {
                console.error("Fetch evaluations error:", fetchError);
            }

            if (data) {
                setEvaluations(data.map(e => ({
                    ...e,
                    created_by_name: e.reviewed_by_name
                })));
            }
        } catch (error) {
            console.error("Error fetching evaluations:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvaluations();
    }, [carePlanId]);

    useEffect(() => {
        if (showForm) {
            const now = new Date();
            setEvalTime(formatInTimeZone(now, UK_TIMEZONE, "HH:mm"));

            // Set next review date to 1 month from now
            const nextMonth = new Date(now);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            setNextReviewDate(format(nextMonth, "yyyy-MM-dd"));
        }
    }, [showForm]);

    const handleSubmit = async () => {
        if (!profile?.id) {
            toast.error("User information not available");
            return;
        }

        if (!comments.trim()) {
            toast.error("Please enter evaluation comments");
            return;
        }

        setIsSubmitting(true);

        try {
            const evalDate = formatInTimeZone(new Date(), UK_TIMEZONE, 'yyyy-MM-dd');

            const insertPayload = {
                care_plan_id: carePlanId,
                evaluation_date: evalDate,
                progress_notes: comments.trim(),
                created_by: profile.id,
                reviewed_by_name: profile.name || profile.email,
                organization_id: profile.active_organization_id,
                resident_id: residentId,
                outcome,
                position: position || null,
                new_review_date: nextReviewDate || null
            };

            const { data: insertedData, error } = await supabase
                .from('care_plan_evaluations')
                .insert(insertPayload)
                .select();

            if (error) {
                console.error("Evaluation insert error:", error);
                toast.error(`Failed to submit: ${error.message}`);
                return;
            }

            toast.success("Evaluation submitted successfully!");
            setComments("");
            setPosition("");
            setOutcome("Reviewed Remain Valid");
            setShowForm(false);
            await fetchEvaluations();
        } catch (error: any) {
            console.error("Error submitting evaluation:", error);
            toast.error("Failed to submit evaluation");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 mt-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    Evaluations
                    <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {evaluations.length}
                    </span>
                </h3>
                {!showForm && (
                    <Button
                        id="new-evaluation-btn"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowForm(true)}
                        className="gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        New Evaluation
                    </Button>
                )}
            </div>

            {showForm && (
                <div className="rounded-xl border bg-card/50 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Evaluation Time (UK)</label>
                            <select
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={evalTime}
                                onChange={(e) => setEvalTime(e.target.value)}
                            >
                                {generateTimeOptions().map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Care Plan Outcome</label>
                            <select
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={outcome}
                                onChange={(e) => setOutcome(e.target.value)}
                            >
                                <option value="Reviewed Remain Valid">Reviewed Remain Valid</option>
                                <option value="Care Plan Amended">Care Plan Amended</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Position (Optional)</label>
                            <input
                                type="text"
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={position}
                                onChange={(e) => setPosition(e.target.value)}
                                placeholder="e.g. Registered Nurse"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Next Review Date</label>
                            <input
                                type="date"
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={nextReviewDate}
                                onChange={(e) => setNextReviewDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Evaluation Notes</label>
                        <Textarea
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            placeholder="Enter evaluation notes and progress..."
                            className="min-h-[100px] bg-background"
                        />
                    </div>

                    <div className="flex gap-2 justify-end">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setShowForm(false);
                                setComments("");
                            }}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !comments.trim()}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                "Save Evaluation"
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {evaluations.length > 0 ? (
                <div className="space-y-3">
                    {evaluations.map((evaluation) => (
                        <div
                            key={evaluation.id}
                            className="rounded-lg border bg-background/50 p-4 space-y-2 hover:border-primary/20 transition-colors"
                        >
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <div className="flex items-center gap-3">
                                    <p className="font-medium flex items-center gap-2">
                                        <span className="text-muted-foreground/60 italic">Evaluation {evaluations.length - evaluations.indexOf(evaluation)}</span>
                                        {evaluation.outcome && (
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${evaluation.outcome === "Care Plan Amended"
                                                ? "bg-orange-50 text-orange-600 border-orange-200"
                                                : "bg-blue-50 text-blue-600 border-blue-200"
                                                }`}>
                                                {evaluation.outcome === "Care Plan Amended" ? "CARE PLAN CHANGE" : evaluation.outcome}
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <p className="font-medium">
                                    {evaluation.evaluation_date
                                        ? formatInTimeZone(
                                            new Date(evaluation.evaluation_date),
                                            UK_TIMEZONE,
                                            "dd MMM yyyy HH:mm"
                                        )
                                        : "Unknown Date"}
                                </p>
                            </div>

                            <Separator className="opacity-50" />

                            <div className="flex items-baseline justify-between gap-4 flex-wrap">
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 whitespace-nowrap">Reviewed Staff:</span>
                                    <p className="text-sm font-semibold text-foreground">
                                        {evaluation.created_by_name || "Unknown Staff"}
                                    </p>
                                    {evaluation.position && (
                                        <p className="text-xs text-muted-foreground">
                                            ({evaluation.position})
                                        </p>
                                    )}
                                </div>

                                {evaluation.new_review_date && (
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 whitespace-nowrap">Next Review Date:</span>
                                        <p className="text-sm font-medium text-foreground">
                                            {format(new Date(evaluation.new_review_date), "dd MMM yyyy")}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1 w-full">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 text-center">Comments</p>
                                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed w-full">
                                    {evaluation.progress_notes || evaluation.comments}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                !showForm && (
                    <div className="text-center py-8 rounded-xl border border-dashed text-sm text-muted-foreground bg-muted/20">
                        No evaluations found for this care plan version.
                    </div>
                )
            )}
        </div>
    );
}
