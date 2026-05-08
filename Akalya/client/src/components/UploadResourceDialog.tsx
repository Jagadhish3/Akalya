import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, FileCheck } from "lucide-react";
import { preparationResourcesAPI, lockerAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface UploadResourceDialogProps {
  onResourceUploaded: () => void;
}

export function UploadResourceDialog({ onResourceUploaded }: UploadResourceDialogProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [classLevel, setClassLevel] = useState("class10");
  const [type, setType] = useState("pdf");
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !file) {
      toast({
        title: "Error",
        description: "Please provide a title and select a file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // 1. Upload to locker first
      const uploadRes = await lockerAPI.upload(file);
      const fileUrl = uploadRes.url || uploadRes.fileUrl;

      if (!fileUrl) throw new Error("Failed to get file URL from locker");

      // 2. Create resource entry
      await preparationResourcesAPI.create({
        title,
        subject,
        classLevel,
        type,
        url: fileUrl,
        targetRole: "all",
      });

      toast({
        title: "Success",
        description: "Resource uploaded successfully",
      });

      setTitle("");
      setSubject("");
      setFile(null);
      setOpen(false);
      onResourceUploaded();
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "An error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Upload Resource
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload New Resource</DialogTitle>
          <DialogDescription>
            Upload PDFs, notes, or videos for your students.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="res-title">Resource Title *</Label>
            <Input
              id="res-title"
              placeholder="e.g. Algebra Basics PDF"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={uploading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="res-subject">Subject</Label>
              <Input
                id="res-subject"
                placeholder="e.g. Mathematics"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={uploading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="res-type">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="res-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF / Document</SelectItem>
                  <SelectItem value="video">Video Lecture</SelectItem>
                  <SelectItem value="link">External Link</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="res-class">Class Level</Label>
            <Select value={classLevel} onValueChange={setClassLevel}>
              <SelectTrigger id="res-class">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="class10">Class 10</SelectItem>
                <SelectItem value="class12">Class 12</SelectItem>
                <SelectItem value="graduation">Graduation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="res-file">File</Label>
            <div className="flex items-center gap-2">
              <Input
                id="res-file"
                type="file"
                onChange={handleFileChange}
                disabled={uploading}
                className="cursor-pointer"
              />
            </div>
            {file && (
              <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                <FileCheck className="h-3 w-3" /> {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={uploading} className="w-full">
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Complete Upload"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
