import { ManifestEditorClient } from "./manifest-editor-client";

const ManifestEditorPage = () => (
  <div className="p-6">
    <h1 className="text-2xl font-semibold">Manifest Editor</h1>
    <p className="mt-1 text-sm text-muted-foreground">
      Browse compiled Manifest entities, commands, and constraints.
    </p>
    <div className="mt-6">
      <ManifestEditorClient />
    </div>
  </div>
);

export default ManifestEditorPage;

