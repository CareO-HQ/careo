"use client";

import { CreateResidentForm } from "@/components/residents/forms/CreateResidentForm"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DialogTrigger } from "@radix-ui/react-dialog"
import { Plus } from "lucide-react"
import React, { useState } from 'react'

const Page = () => {
    const [isOpen, setIsOpen] = useState(false)
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>  <Plus className="h-6 w-6" />Add Resident</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Resident Profile</DialogTitle>
                    <DialogDescription>
                        Enter the resident’s personal information and care details to create their profile.
                    </DialogDescription>
                </DialogHeader>
                <CreateResidentForm onSuccess={() => setIsOpen(false)} />
            </DialogContent>
        </Dialog>
    )
}

export default Page
