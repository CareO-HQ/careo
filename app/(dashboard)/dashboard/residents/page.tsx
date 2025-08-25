"use client"

import { DataTable } from "./data-table"
import { columns } from "./ columns"
import data from "./data.json"

const Page = () => {
    return (
        <div className="container mx-auto py-10">
            <h1 className="text-2xl font-bold mb-4">Residents</h1>
            <DataTable columns={columns} data={data} />
        </div>
    )
}

export default Page
