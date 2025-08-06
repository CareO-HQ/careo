"use client";

import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { useQuery } from "convex/react";
import { useQueryState } from "nuqs";
import { useEffect } from "react";

export default function SessionPage() {
  const { data: member, isPending } = authClient.useActiveMember();
  const [memberId] = useQueryState("memberId");

  useEffect(() => {
    console.log("GET MEMBER");
  }, [isPending]);

  if (isPending) {
    // TODO: Improve loading state
    return <div>Loading...</div>;
  }

  if (member?.role !== "owner" && member?.role !== "admin") {
    return <div>You are not authorized to access this page</div>;
  }

  console.log("MEMBER ID", memberId);

  return <div>SessionPage</div>;
}
