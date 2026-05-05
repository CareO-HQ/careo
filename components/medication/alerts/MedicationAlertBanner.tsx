"use client";

import { Bell, AlertTriangle, Clock, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface MedicationAlert {
    id: string;
    resident_id: string;
    type?: string;
    /** Legacy alias; prefer `type` from API */
    alert_type?: string;
    severity: 'critical' | 'warning' | 'info';
    title: string;
    message: string;
    is_resolved: boolean;
    metadata?: {
        intake_id?: string;
        scheduled_time?: string;
        medication_id?: string;
        alert_subtype?: string;
    };
}

interface MedicationAlertBannerProps {
    alerts: MedicationAlert[];
    onDismiss: (alertId: string) => void;
    onAlertClick?: (alert: MedicationAlert) => void;
}

export function MedicationAlertBanner({ alerts, onDismiss, onAlertClick }: MedicationAlertBannerProps) {
    const displayAlerts = alerts?.filter(a => a.metadata?.alert_subtype !== 'low_stock') || [];
    if (!displayAlerts || displayAlerts.length === 0) return null;

    return (
        <div className="flex flex-col gap-3 mb-6">
            {displayAlerts.map((alert) => (
                <Alert
                    key={alert.id}
                    variant={alert.severity === 'critical' ? 'destructive' : 'default'}
                    className={cn(
                        "relative border-l-4",
                        onAlertClick && "cursor-pointer",
                        alert.severity === 'info' && "border-l-blue-500 bg-blue-50/50",
                        alert.severity === 'warning' && "border-l-yellow-500 bg-yellow-50/50",
                        alert.severity === 'critical' && "border-l-red-500"
                    )}
                    onClick={() => onAlertClick?.(alert)}
                >
                    <div className="flex items-start gap-4">
                        <div className="mt-1">
                            {alert.severity === 'critical' ? (
                                <AlertTriangle className="h-5 w-5" />
                            ) : alert.severity === 'info' ? (
                                <Clock className="h-5 w-5 text-blue-600" />
                            ) : (
                                <Bell className="h-5 w-5 text-yellow-600" />
                            )}
                        </div>

                        <div className="flex-1 pr-8">
                            <AlertTitle className="font-bold">
                                {alert.title}
                            </AlertTitle>
                            <AlertDescription className="text-sm">
                                {alert.message}
                            </AlertDescription>
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8 hover:bg-black/5"
                            onClick={(event) => {
                                event.stopPropagation();
                                onDismiss(alert.id);
                            }}
                        >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Dismiss</span>
                        </Button>
                    </div>
                </Alert>
            ))}
        </div>
    );
}
