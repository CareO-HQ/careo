"use client";

import { DataTable } from "@/components/DataTable";
import { columns } from "@/components/settings/labels/columns";
import CreateLabelModal from "@/components/settings/labels/CreateLabelModal";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useEffect, useState } from "react";

interface Label {
  id: string;
  name: string;
  color: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export default function LabelsPage() {
  const { activeOrganizationId } = useActiveTeam();
  const { supabase } = useSupabase();
  const [labels, setLabels] = useState<Label[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!activeOrganizationId || !supabase) {
      setIsLoading(false);
      return;
    }

    const fetchLabels = async () => {
      try {
        const { data, error } = await supabase
          .from("labels")
          .select("*")
          .eq("organization_id", activeOrganizationId)
          .order("name", { ascending: true });

        if (error) throw error;
        setLabels(data || []);
      } catch (error) {
        console.error("Error fetching labels:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLabels();
  }, [activeOrganizationId, supabase]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading labels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-start items-start gap-8">
      <div className="flex flex-row justify-between items-center w-full">
        <p className="font-semibold text-xl">Labels</p>
        <CreateLabelModal />
      </div>
      <div className="flex flex-col justify-start items-start gap-4 w-full">
        <DataTable columns={columns} data={labels} />
      </div>
    </div>
  );
}
