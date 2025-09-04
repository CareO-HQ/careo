import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CareFilePage() {
  return (
    <div>
      <p className="font-semibold text-xl">Care File</p>
      <p className="text-sm text-muted-foreground">
        Create and manage the care files for the resident.
      </p>
      <Tabs defaultValue="all" className="w-[400px] mt-6">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="to-do">To Do</TabsTrigger>
          <TabsTrigger value="done">Done</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          All the care files for the resident.
        </TabsContent>
        <TabsContent value="to-do">
          Not done the care files for the resident.
        </TabsContent>
        <TabsContent value="done">
          Done the care files for the resident.
        </TabsContent>
      </Tabs>
    </div>
  );
}
