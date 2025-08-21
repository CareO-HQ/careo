import { CreateResidentForm } from "@/components/residents/forms/CreateResidentForm"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DialogTrigger } from "@radix-ui/react-dialog"
import React from 'react'

const Page = () => {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button>Open</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Title</DialogTitle>
                    <DialogDescription>Some description</DialogDescription>
                </DialogHeader>
                <CreateResidentForm />
            </DialogContent>
        </Dialog>
    )
}

export default Page
