import FilesToolbar from "@/components/files/FilesToolbar";

export default function FilesPage() {
  const files = [];
  return (
    <div className="flex flex-col gap-4 w-full">
      <FilesToolbar />
      {files.length ? (
        <p>Files</p>
      ) : (
        <div className="w-full flex flex-row justify-center items-center p-10 border rounded-md bg-muted/30 text-muted-foreground text-sm">
          No files here yet.
        </div>
      )}
    </div>
  );
}
