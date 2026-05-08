import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { lockerAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { FolderOpen, Upload, Download, Trash2, Edit2, Eye } from "lucide-react";
import { format } from "date-fns";

const MAX_MB = 500;

export default function Locker({ embedded }: { embedded?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<any[]>([]);
  const [usage, setUsage] = useState<{ usedBytes: number; limitBytes: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const load = () => {
    if (!user) return;
    lockerAPI.list().then((data) => setFiles(Array.isArray(data) ? data : []));
    lockerAPI.getUsage().then(setUsage);
  };

  useEffect(() => {
    load();
  }, [user]);

  const onFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      await lockerAPI.upload(file);
      toast({ title: "Uploaded", description: file.name });
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Upload failed" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await lockerAPI.rename(id, editName.trim());
      setEditingId(null);
      setEditName("");
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Rename failed" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this file?")) return;
    try {
      await lockerAPI.delete(id);
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Delete failed" });
    }
  };

  const handleDownload = async (f: any) => {
    try {
      await lockerAPI.download(f.id || f._id, f.displayName || f.originalName);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Download failed" });
    }
  };

  const handleView = async (f: any) => {
    try {
      await lockerAPI.view(f.id || f._id);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "View failed" });
    }
  };

  if (!user) {
    const msg = (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Please log in as a student to access your digital locker. Upload certificates and documents (max 500MB total).
          </CardContent>
        </Card>
      </div>
    );
    if (embedded) return msg;
    return <AppLayout>{msg}</AppLayout>;
  }

  const usedMB = usage ? (usage.usedBytes / (1024 * 1024)).toFixed(2) : "0";
  const limitMB = usage ? (usage.limitBytes / (1024 * 1024)).toFixed(0) : String(MAX_MB);

  const content = (
    <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">My Locker</h1>
        <p className="text-muted-foreground mb-6">
          Store your certificates and documents securely. Upload (PDF files only, max 100MB per file), rename, download or delete. Total storage limit: {limitMB} MB per user.
        </p>
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2"><FolderOpen className="h-5 w-5" /> Storage</CardTitle>
            <CardDescription>Used: {usedMB} MB / {limitMB} MB</CardDescription>
          </CardHeader>
          <CardContent>
            <label className="inline-block">
              <input id="locker-upload" type="file" className="hidden" accept=".pdf" onChange={onFileSelect} disabled={uploading} />
              <Button type="button" variant="outline" className="gap-2" disabled={uploading} onClick={() => document.getElementById("locker-upload")?.click()}>
                <Upload className="h-4 w-4" /> {uploading ? "Uploading..." : "Upload PDF (Max 100MB)"}
              </Button>
            </label>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Your files</CardTitle>
            <CardDescription>Upload date and size shown. Click to rename or download.</CardDescription>
          </CardHeader>
          <CardContent>
            {files.length === 0 ? (
              <p className="text-muted-foreground py-4">No files yet. Upload certificates or documents above.</p>
            ) : (
              <ul className="space-y-2">
                {files.map((f) => (
                  <li key={f.id || f._id} className="flex items-center justify-between gap-4 py-2 border-b last:border-0">
                    <div className="min-w-0 flex-1">
                      {editingId === (f.id || f._id) ? (
                        <div className="flex gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Display name"
                            className="max-w-xs"
                          />
                          <Button size="sm" onClick={() => handleRename(f.id || f._id)}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditName(""); }}>Cancel</Button>
                        </div>
                      ) : (
                        <span className="font-medium truncate block">{f.displayName || f.originalName}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {(f.size / 1024).toFixed(1)} KB • {f.createdAt ? format(new Date(f.createdAt), "dd MMM yyyy") : ""}
                      </span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {editingId !== (f.id || f._id) && (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => handleView(f)} title="View Document">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => { setEditingId(f.id || f._id); setEditName(f.displayName || f.originalName || ""); }}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDownload(f)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(f.id || f._id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
  );
  if (embedded) return content;
  return <AppLayout>{content}</AppLayout>;
}
