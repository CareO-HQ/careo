"use client";

import { useState, useEffect, useMemo } from "react";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, TrendingUp, TrendingDown, Minus, Scale, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface WeightRecord {
  id: string;
  resident_id: string;
  weight_kg: number;
  weight_lb?: number;
  unit: string;
  measurement_date: string;
  measurement_time?: string;
  measured_by?: string;
  notes?: string;
  created_at: string;
}

interface WeightChartProps {
  residentId: string;
  residentName?: string;
}

export function WeightChart({ residentId, residentName }: WeightChartProps) {
  const { profile } = useProfile();
  const [records, setRecords] = useState<WeightRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"weekly" | "monthly">("monthly");

  // Form state
  const [weight, setWeight] = useState("");
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const [measurementDate, setMeasurementDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Fetch weight records
  const fetchWeightRecords = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("weight_records")
        .select("*")
        .eq("resident_id", residentId)
        .order("measurement_date", { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error("Error fetching weight records:", error);
      toast.error("Failed to load weight records");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWeightRecords();
  }, [residentId]);

  // Filter records based on view mode
  const filteredRecords = useMemo(() => {
    const now = new Date();
    const cutoffDate = new Date();

    if (viewMode === "weekly") {
      cutoffDate.setDate(now.getDate() - 90); // Last 90 days for weekly view
    } else {
      cutoffDate.setMonth(now.getMonth() - 12); // Last 12 months for monthly view
    }

    return records.filter(record => new Date(record.measurement_date) >= cutoffDate);
  }, [records, viewMode]);

  // Prepare chart data
  const chartData = useMemo(() => {
    return [...filteredRecords]
      .reverse()
      .map(record => ({
        date: format(new Date(record.measurement_date), "MMM dd"),
        weight: parseFloat(record.weight_kg.toString()),
      }));
  }, [filteredRecords]);

  // Calculate weight change
  const weightChange = useMemo(() => {
    if (records.length < 2) return null;
    const latest = parseFloat(records[0].weight_kg.toString());
    const previous = parseFloat(records[1].weight_kg.toString());
    const change = latest - previous;
    return {
      value: Math.abs(change),
      trend: change > 0 ? "up" : change < 0 ? "down" : "stable",
    };
  }, [records]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight || !measurementDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    try {
      const weightValue = parseFloat(weight);
      const { error } = await supabase.from("weight_records").insert({
        resident_id: residentId,
        organization_id: profile?.active_organization_id,
        care_home_id: profile?.active_care_home_id,
        team_id: profile?.active_team_id,
        weight_kg: unit === "kg" ? weightValue : weightValue * 0.453592, // Convert lb to kg
        weight_lb: unit === "lb" ? weightValue : weightValue * 2.20462, // Convert kg to lb
        unit,
        measurement_date: measurementDate,
        measured_by: profile?.name || profile?.email,
        measured_by_id: profile?.id,
        notes: notes || null,
        created_by: profile?.id,
      });

      if (error) throw error;

      toast.success("Weight recorded successfully");
      setIsDialogOpen(false);
      resetForm();
      fetchWeightRecords();
    } catch (error) {
      console.error("Error saving weight record:", error);
      toast.error("Failed to save weight record");
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setWeight("");
    setUnit("kg");
    setMeasurementDate(format(new Date(), "yyyy-MM-dd"));
    setNotes("");
  };

  return (
    <div className="space-y-4">
      {/* Header with toggle and record button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-900">Weight Tracking</h3>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-md">
            <button
              onClick={() => setViewMode("weekly")}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-all ${
                viewMode === "weekly"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setViewMode("monthly")}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-all ${
                viewMode === "monthly"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Monthly
            </button>
          </div>

          {/* Record button */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="h-7 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Record
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base">Record Weight</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                      Weight <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="0.00"
                      className="h-8 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                      Unit <span className="text-red-500">*</span>
                    </label>
                    <Select value={unit} onValueChange={(value: "kg" | "lb") => setUnit(value)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg" className="text-sm">kg</SelectItem>
                        <SelectItem value="lb" className="text-sm">lb</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={measurementDate}
                    onChange={(e) => setMeasurementDate(e.target.value)}
                    className="h-8 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                    Notes (optional)
                  </label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any observations..."
                    className="text-sm min-h-[60px] resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1 h-8 text-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 h-8 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Weight"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Weight trend indicator */}
      {weightChange && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {weightChange.trend === "up" && (
                <TrendingUp className="w-4 h-4 text-green-600" />
              )}
              {weightChange.trend === "down" && (
                <TrendingDown className="w-4 h-4 text-orange-600" />
              )}
              {weightChange.trend === "stable" && (
                <Minus className="w-4 h-4 text-gray-600" />
              )}
              <span className="text-xs text-gray-600">
                {weightChange.trend === "up" && "Weight increased"}
                {weightChange.trend === "down" && "Weight decreased"}
                {weightChange.trend === "stable" && "Weight stable"}
              </span>
            </div>
            <span className="text-xs font-medium text-gray-900">
              {weightChange.trend !== "stable" && (
                <span className={weightChange.trend === "up" ? "text-green-600" : "text-orange-600"}>
                  {weightChange.trend === "up" ? "+" : "-"}{weightChange.value.toFixed(1)} kg
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                stroke="#e5e7eb"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6b7280" }}
                stroke="#e5e7eb"
                domain={['dataMin - 2', 'dataMax + 2']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Records table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-8">
            <Scale className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No weight records yet</p>
            <p className="text-xs text-gray-400 mt-1">Click "Record" to add the first entry</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-xs font-medium text-gray-600">Date</TableHead>
                <TableHead className="text-xs font-medium text-gray-600">Weight</TableHead>
                <TableHead className="text-xs font-medium text-gray-600">Change</TableHead>
                <TableHead className="text-xs font-medium text-gray-600">Recorded By</TableHead>
                <TableHead className="text-xs font-medium text-gray-600">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record, index) => {
                const previousRecord = records[index + 1];
                const change = previousRecord
                  ? parseFloat(record.weight_kg.toString()) - parseFloat(previousRecord.weight_kg.toString())
                  : null;

                return (
                  <TableRow key={record.id} className="hover:bg-gray-50">
                    <TableCell className="text-xs text-gray-900">
                      {format(new Date(record.measurement_date), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-gray-900">
                      {parseFloat(record.weight_kg.toString()).toFixed(1)} kg
                    </TableCell>
                    <TableCell className="text-xs">
                      {change !== null && change !== 0 && (
                        <span className={change > 0 ? "text-green-600" : "text-orange-600"}>
                          {change > 0 ? "+" : ""}{change.toFixed(1)} kg
                        </span>
                      )}
                      {change === 0 && <span className="text-gray-400">—</span>}
                      {change === null && <span className="text-gray-400">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-gray-600">
                      {record.measured_by || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-gray-600 max-w-[200px] truncate">
                      {record.notes || "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
