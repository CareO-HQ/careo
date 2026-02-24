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
            const { data } = await supabase
                .from('care_plan_evaluations')
                .select('*')
                .eq('care_plan_id', carePlanId)
                .order('created_at', { ascending: false });

            if (data) {
                setEvaluations(data);
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
            setEvalTime(formatInTimeZone(new Date(), UK_TIMEZONE, "HH:mm"));
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
            const { error } = await supabase.from('care_plan_evaluations').insert({
                care_plan_id: carePlanId,
                evaluation_date: (() => {
                    if (evalTime) {
                        const todayUK = formatInTimeZone(new Date(), UK_TIMEZONE, 'yyyy-MM-dd');
                        const dateTimeString = `${todayUK}T${evalTime}:00`;
                        return fromZonedTime(dateTimeString, UK_TIMEZONE).toISOString();
                    }
                    return new Date().toISOString();
                })(),
                progress_notes: comments.trim(),
                created_by: profile.id,
                organization_id: profile.active_organization_id,
                resident_id: residentId
            });

            if (error) throw error;

            toast.success("Evaluation submitted successfully!");
            setComments("");
            setShowForm(false);
            fetchEvaluations();
        } catch (error) {
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
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Progress Notes</label>
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
                                <p className="font-medium">
                                    {evaluation.evaluation_date
                                        ? formatInTimeZone(
                                            new Date(evaluation.evaluation_date),
                                            UK_TIMEZONE,
                                            "dd MMMM yyyy"
                                        )
                                        : "Unknown Date"}
                                </p>
                                {evaluation.created_by_name && (
                                    <p className="bg-muted px-2 py-0.5 rounded-full">{evaluation.created_by_name}</p>
                                )}
                            </div>
                            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                {evaluation.progress_notes || evaluation.comments}
                            </p>
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
