import CreateMedicationDemo from "@/components/medication/demo/CreateMedicationDemo";
import { DataTable } from "./data-table";
import data from "./data.json"
export default function MedicationPage() {
  return (
    <div>
      <CreateMedicationDemo />
      <DataTable data={data} />
    </div>
  );
}
