"use client";

import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { acceptAgencyRequest, approveAgencyRequest, inviteAgencyStaff, offboardAgencyStaff, regenerateAgencyLinkCode } from "@/app/actions/agency-onboarding";
import { ShieldCheck, UserCheck, History, Clock, FileText, Send, UserX, CheckCircle, MailCheck, AlertCircle, Building } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AgencyPage() {
  const { profile } = useProfile();
  const { supabase, user } = useSupabase();

  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("requests");
  
  // Action status indicators
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  // Approval dialog states (now shown at the "Approve" step, after accepting)
  const [selectedRequestForApprove, setSelectedRequestForApprove] = useState<any | null>(null);
  const [profileVerified, setProfileVerified] = useState(false);
  const [inductionGiven, setInductionGiven] = useState(false);
  const [inductionGivenBy, setInductionGivenBy] = useState("");
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>("all");

  const activeCareHomeId = profile?.active_care_home_id;
  const activeCareHomeName = profile?.care_home_name || "the care home";
  const currentUserName = profile?.name || user?.email || "Manager";

  const fetchAgencyRequests = useCallback(async () => {
    if (!activeCareHomeId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("agency_requests")
        .select(`
          *,
          agency_staff:agency_staff_id (*),
          teams:team_id (name)
        `)
        .eq("care_home_id", activeCareHomeId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err: any) {
      console.error("Error loading agency requests:", err);
      toast.error("Failed to load requests.");
    } finally {
      setIsLoading(false);
    }
  }, [activeCareHomeId, supabase]);

  const fetchCareHomeCode = useCallback(async () => {
    if (!activeCareHomeId) return;
    try {
      const { data, error } = await supabase
        .from("care_homes")
        .select("agency_link_code")
        .eq("id", activeCareHomeId)
        .single();
      if (!error && data) {
        setLinkCode(data.agency_link_code);
      }
    } catch (err) {
      console.error("Error loading agency link code:", err);
    }
  }, [activeCareHomeId, supabase]);

  useEffect(() => {
    if (activeCareHomeId) {
      fetchAgencyRequests();
      fetchCareHomeCode();
    }
  }, [activeCareHomeId, fetchAgencyRequests, fetchCareHomeCode]);

  const handleRegenerateCode = async () => {
    if (!activeCareHomeId) return;
    setIsGeneratingCode(true);
    try {
      const res = await regenerateAgencyLinkCode(activeCareHomeId);
      if (res.success) {
        setLinkCode(res.code || null);
        toast.success("Agency link code regenerated!");
      } else {
        toast.error(res.error || "Failed to generate link code.");
      }
    } catch (err) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    setSubmittingId(requestId);
    try {
      const res = await acceptAgencyRequest(requestId);
      if (res.success) {
        toast.success("Request accepted!");
        await fetchAgencyRequests();
      } else {
        toast.error(res.error || "Failed to accept request.");
      }
    } catch (err: any) {
      toast.error("An unexpected error occurred.");
    } finally {
      setSubmittingId(null);
    }
  };

  const handleApproveAndInvite = async (
    request: any,
    profileVerifiedVal: boolean,
    inductionGivenVal: boolean,
    inductionGivenByVal: string | null
  ) => {
    setSubmittingId(request.id);
    try {
      // Save verification details
      const approveRes = await approveAgencyRequest(
        request.id,
        profileVerifiedVal,
        currentUserName,
        inductionGivenVal,
        inductionGivenByVal
      );
      if (!approveRes.success) {
        toast.error(approveRes.error || "Failed to approve request.");
        return;
      }

      // Send invite email
      const inviteRes = await inviteAgencyStaff({
        requestId: request.id,
        email: request.agency_staff.email,
        role: request.agency_staff.role,
        careHomeName: activeCareHomeName,
        inviterName: currentUserName
      });

      if (inviteRes.success) {
        toast.success(`Approved! Invitation email sent to ${request.agency_staff.email}!`);
        if (inviteRes.inviteLink) {
          console.log("DEBUG: Onboarding link ->", inviteRes.inviteLink);
        }
      } else {
        if (inviteRes.inviteLink) {
          toast.warning(`Approved, but email failed: ${inviteRes.error || 'Check Resend key'}. Link in console.`);
          console.log("DEBUG Onboarding Link:", inviteRes.inviteLink);
        } else {
          toast.error(inviteRes.error || "Approved, but failed to send invitation email.");
        }
      }

      await fetchAgencyRequests();
    } catch (err: any) {
      toast.error("An unexpected error occurred.");
    } finally {
      setSubmittingId(null);
    }
  };

  const handleDecline = async (requestId: string) => {
    setSubmittingId(requestId);
    try {
      const { error } = await supabase
        .from("agency_requests")
        .update({
          status: "declined",
          updated_at: new Date().toISOString()
        })
        .eq("id", requestId);

      if (error) throw error;

      // Reset staff status back to available
      const { data: request } = await supabase
        .from("agency_requests")
        .select("agency_staff_id")
        .eq("id", requestId)
        .single();
      
      if (request?.agency_staff_id) {
        await supabase
          .from("agency_staff")
          .update({ status: "available" })
          .eq("id", request.agency_staff_id);
      }

      toast.success("Request declined.");
      await fetchAgencyRequests();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to decline request.");
    } finally {
      setSubmittingId(null);
    }
  };

  const handleOffboard = async (request: any) => {
    const confirm = window.confirm(`Are you sure you want to offboard ${request.agency_staff?.name}? This will remove their system access.`);
    if (!confirm) return;

    setSubmittingId(request.id);
    try {
      // Find auth_user_id from agency_staff
      const userId = request.agency_staff?.auth_user_id;

      const res = await offboardAgencyStaff({
        userId: userId,
        requestId: request.id,
        staffId: request.agency_staff_id
      });

      if (res.success) {
        toast.success("Staff member successfully offboarded and returned to pool.");
        await fetchAgencyRequests();
      } else {
        toast.error(res.error || "Failed to offboard staff member.");
      }
    } catch (err: any) {
      toast.error("An unexpected error occurred.");
    } finally {
      setSubmittingId(null);
    }
  };

  // Group history by month of offboarded_at/updated_at/created_at
  const groupHistoryByMonth = (historyList: any[]) => {
    const groups: { [key: string]: any[] } = {};
    
    // Sort history by date descending
    const sorted = [...historyList].sort((a, b) => {
      const dateA = new Date(a.offboarded_at || a.updated_at || a.created_at).getTime();
      const dateB = new Date(b.offboarded_at || b.updated_at || b.created_at).getTime();
      return dateB - dateA;
    });

    sorted.forEach((req) => {
      const date = new Date(req.offboarded_at || req.updated_at || req.created_at);
      const monthYear = date.toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric"
      }); // e.g. "May 2026"
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(req);
    });

    return groups;
  };

  const pendingRequests = requests.filter(r => r.status === "pending" || r.status === "accepted" || r.status === "approved");
  const activeStaff = requests.filter(r => r.status === "active");
  const historyStaff = requests.filter(r => r.status === "offboarded" || r.status === "declined");

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (!activeCareHomeId) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[50vh] text-center">
        <AlertCircle className="w-12 h-12 text-slate-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">No Care Home Context</h2>
        <p className="text-slate-500 max-w-sm mt-2">
          Please select a Care Home in the sidebar team switcher to access agency staffing tools.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Sticky Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Agency Staffing</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage temporary healthcare workers, approve assignments, and send onboarding links.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchAgencyRequests} 
          disabled={isLoading}
          className="bg-white hover:bg-slate-50 border-slate-200"
        >
          Refresh Data
        </Button>
      </div>

      {/* Agency Link Code Card */}
      <Card className="border-slate-100/80 bg-white/65 shadow-sm">
        <CardContent className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Building className="w-4.5 h-4.5 text-teal-600" />
              Agency Linkage Code
            </h3>
            <p className="text-slate-500 text-xs">
              Give this 5-character code to your agency supervisor to connect this care home in their portal.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {linkCode ? (
              <div className="flex items-center gap-2">
                <span className="font-mono text-xl font-bold bg-slate-100 text-slate-800 px-3.5 py-1.5 rounded-lg border border-slate-200 tracking-wider">
                  {linkCode}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(linkCode);
                    toast.success("Code copied to clipboard!");
                  }}
                  className="bg-white hover:bg-slate-50 border-slate-200"
                >
                  Copy
                </Button>
              </div>
            ) : (
              <span className="text-sm text-slate-400 font-medium italic">No code generated yet</span>
            )}
            <Button
              size="sm"
              onClick={handleRegenerateCode}
              disabled={isGeneratingCode}
              className="bg-teal-600 hover:bg-teal-700 text-white font-medium"
            >
              {isGeneratingCode ? "Generating..." : linkCode ? "Regenerate Code" : "Generate Code"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Layout */}
      <Tabs defaultValue="requests" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full sm:w-[500px] grid-cols-3 bg-slate-100/80 p-1 rounded-xl">
          <TabsTrigger value="requests" className="rounded-lg flex gap-2">
            <ShieldCheck className="w-4 h-4" />
            Requests ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="rounded-lg flex gap-2">
            <UserCheck className="w-4 h-4" />
            Active ({activeStaff.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg flex gap-2">
            <History className="w-4 h-4" />
            History ({historyStaff.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. Pending Requests Tab */}
        <TabsContent value="requests" className="mt-6 space-y-4">
          <Card className="border-slate-100/85 shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-800">Incoming Agency Requests</CardTitle>
              <CardDescription>
                Approve requests and send onboarding links to nurses and care assistants.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center text-slate-400">Loading requests...</div>
              ) : pendingRequests.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium text-slate-500">No pending requests</p>
                  <p className="text-xs text-slate-400 mt-1">Requests from the agency portal will appear here.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Worker Details</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Compliance & Docs</TableHead>
                      <TableHead>Date Sent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.map((req) => (
                      <TableRow key={req.id} className="hover:bg-slate-50/50">
                        <TableCell>
                          <div className="font-semibold text-slate-800">{req.agency_staff?.name}</div>
                          <div className="text-xs text-slate-500">{req.agency_staff?.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize bg-slate-50 text-slate-700">
                            {req.agency_staff?.role?.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-slate-700 text-sm">
                          {req.teams?.name || "Whole Care Home"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-slate-600 font-medium">
                              Skills: {req.agency_staff?.skills?.join(", ") || "None listed"}
                            </span>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5" />
                              {req.agency_staff?.certifications?.length || 0} Certifications
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm">
                          {formatDate(req.created_at)}
                        </TableCell>
                        <TableCell>
                          {req.status === "approved" ? (
                            <Badge className="bg-sky-50 text-sky-700 border-sky-100 font-medium">
                              {req.activation_sent ? "Invite Sent" : "Approved"}
                            </Badge>
                          ) : req.status === "accepted" ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-medium">
                              Accepted
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-50 text-amber-700 border-amber-100 font-medium">
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {req.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleAccept(req.id)}
                                  disabled={submittingId === req.id}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDecline(req.id)}
                                  disabled={submittingId === req.id}
                                  className="text-red-600 hover:text-red-700 border-slate-200"
                                >
                                  Decline
                                </Button>
                              </>
                            )}

                            {req.status === "accepted" && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedRequestForApprove(req);
                                  setProfileVerified(false);
                                  setInductionGiven(false);
                                  setInductionGivenBy("");
                                }}
                                disabled={submittingId === req.id}
                                className="bg-teal-600 hover:bg-teal-700 text-white font-medium flex gap-1.5"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Approve
                              </Button>
                            )}

                            {req.status === "approved" && !req.activation_sent && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 pr-2">
                                <MailCheck className="w-4 h-4 text-teal-600" />
                                Onboarding Link Emailed
                              </div>
                            )}

                            {req.status === "approved" && req.activation_sent && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 pr-2">
                                <MailCheck className="w-4 h-4 text-teal-600" />
                                Onboarding Link Emailed
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Active Staff Tab */}
        <TabsContent value="active" className="mt-6 space-y-4">
          <Card className="border-slate-100/85 shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-800">Active Agency Workers</CardTitle>
              <CardDescription>
                Currently active workers who have accepted their onboarding links and can log in.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center text-slate-400">Loading active staff...</div>
              ) : activeStaff.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <UserCheck className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium text-slate-500">No active agency workers</p>
                  <p className="text-xs text-slate-400 mt-1">Once workers accept onboarding invites, they will appear here.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Worker Details</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Activated At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeStaff.map((req) => (
                      <TableRow key={req.id} className="hover:bg-slate-50/50">
                        <TableCell>
                          <div className="font-semibold text-slate-800">{req.agency_staff?.name}</div>
                          <div className="text-xs text-slate-500">{req.agency_staff?.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-teal-50 text-teal-700 border-teal-100 font-medium capitalize">
                            {req.agency_staff?.role?.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-slate-700 text-sm">
                          {req.teams?.name || "Whole Care Home"}
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm">
                          {req.activated_at ? formatDate(req.activated_at) : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOffboard(req)}
                            disabled={submittingId === req.id}
                            className="text-red-600 hover:text-red-700 border-red-100 hover:bg-red-50 flex gap-1.5 ml-auto"
                          >
                            <UserX className="w-4 h-4" />
                            End Shift / Offboard
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. History Tab */}
        <TabsContent value="history" className="mt-6 space-y-4">
          <Card className="border-slate-100/85 shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-800">Assignment History</CardTitle>
              <CardDescription>
                Records of past temporary worker shifts and declined requests.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center text-slate-400">Loading history...</div>
              ) : historyStaff.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <History className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium text-slate-500">No history records</p>
                  <p className="text-xs text-slate-400 mt-1">Previous assignments will be stored here.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Month Filter Dropdown */}
                  <div className="flex items-center gap-2.5 pb-2">
                    <span className="text-xs font-semibold text-slate-500">Filter by Month:</span>
                    <Select value={selectedMonthFilter} onValueChange={setSelectedMonthFilter}>
                      <SelectTrigger className="w-[180px] h-9 bg-white border-slate-200">
                        <SelectValue placeholder="Select a month" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        {Object.keys(groupHistoryByMonth(historyStaff)).map((month) => (
                          <SelectItem key={month} value={month}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {Object.entries(
                    selectedMonthFilter === "all"
                      ? groupHistoryByMonth(historyStaff)
                      : { [selectedMonthFilter]: groupHistoryByMonth(historyStaff)[selectedMonthFilter] || [] }
                  ).map(([month, reqs]) => (
                    reqs && reqs.length > 0 && (
                      <div key={month} className="space-y-3">
                        <h4 className="font-bold text-slate-800 text-sm border-l-4 border-teal-600 pl-2 mt-4 first:mt-0">
                          {month}
                        </h4>
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead>Worker Details</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Team</TableHead>
                              <TableHead>Assignment Period</TableHead>
                              <TableHead>Verified By</TableHead>
                              <TableHead>Inducted By</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {reqs.map((req) => (
                              <TableRow key={req.id} className="hover:bg-slate-50/50">
                                <TableCell>
                                  <div className="font-semibold text-slate-800">{req.agency_staff?.name}</div>
                                  <div className="text-xs text-slate-500">{req.agency_staff?.email}</div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="capitalize bg-slate-50 text-slate-700">
                                    {req.agency_staff?.role?.replace("_", " ")}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-medium text-slate-700 text-sm">
                                  {req.teams?.name || "Whole Care Home"}
                                </TableCell>
                                <TableCell className="text-slate-600 text-sm">
                                  {req.status === "declined" ? (
                                    "Declined"
                                  ) : (
                                    <div className="flex flex-col">
                                      <span>From: {req.activated_at ? formatDate(req.activated_at) : "N/A"}</span>
                                      <span>To: {req.offboarded_at ? formatDate(req.offboarded_at) : "N/A"}</span>
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="text-slate-650 text-sm font-medium">
                                  {req.profile_verified_by || "—"}
                                </TableCell>
                                <TableCell className="text-slate-650 text-sm font-medium">
                                  {req.induction_given_by || "—"}
                                </TableCell>
                                <TableCell>
                                  {req.status === "offboarded" ? (
                                    <Badge className="bg-slate-50 text-slate-600 border-slate-100 font-medium">
                                      Offboarded
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-red-50 text-red-700 border-red-100 font-medium">
                                      Declined
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog for approval verification & induction details */}
      <Dialog open={!!selectedRequestForApprove} onOpenChange={(open) => {
        if (!open) {
          setSelectedRequestForApprove(null);
          setProfileVerified(false);
          setInductionGiven(false);
          setInductionGivenBy("");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve & Send Onboarding Invite</DialogTitle>
            <DialogDescription>
              Confirm verification and induction details for {selectedRequestForApprove?.agency_staff?.name} before sending the onboarding invite.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              <Checkbox 
                id="profile-verified" 
                checked={profileVerified} 
                onCheckedChange={(checked) => setProfileVerified(!!checked)}
              />
              <label htmlFor="profile-verified" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                Profile verified
              </label>
            </div>
            
            <div className="flex items-center gap-3">
              <Checkbox 
                id="induction-given" 
                checked={inductionGiven} 
                onCheckedChange={(checked) => {
                  setInductionGiven(!!checked);
                  if (!checked) setInductionGivenBy("");
                }}
              />
              <label htmlFor="induction-given" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                Induction given
              </label>
            </div>

            {inductionGiven && (
              <div className="space-y-1.5 pl-7 animate-in fade-in slide-in-from-top-1 duration-200">
                <label htmlFor="induction-given-by" className="text-xs font-semibold text-slate-605">
                  Who conducted the induction?
                </label>
                <input
                  id="induction-given-by"
                  type="text"
                  value={inductionGivenBy}
                  onChange={(e) => setInductionGivenBy(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Enter inductor's name"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRequestForApprove(null);
                setProfileVerified(false);
                setInductionGiven(false);
                setInductionGivenBy("");
              }}
              disabled={submittingId === selectedRequestForApprove?.id}
            >
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              onClick={async () => {
                if (selectedRequestForApprove) {
                  await handleApproveAndInvite(
                    selectedRequestForApprove,
                    profileVerified,
                    inductionGiven,
                    inductionGiven ? inductionGivenBy : null
                  );
                  setSelectedRequestForApprove(null);
                  setProfileVerified(false);
                  setInductionGiven(false);
                  setInductionGivenBy("");
                }
              }}
              disabled={
                submittingId === selectedRequestForApprove?.id ||
                !profileVerified ||
                !inductionGiven ||
                inductionGivenBy.trim() === ""
              }
            >
              Approve & Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
