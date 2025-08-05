import React from 'react'
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export const SessionManage = () => {
  const router = useRouter()

  const handleManageSessions = () => {
    router.push('/settings/security')
  }

  return (
    <Button variant="outline" size="sm" onClick={handleManageSessions}>
      Manage sessions
    </Button>
  )
}


