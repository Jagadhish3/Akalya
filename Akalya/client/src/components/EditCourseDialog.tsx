import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { coursesAPI, lockerAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { BookOpen, Loader2, FileCheck } from "lucide-react";
import { z } from "zod";

const courseSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().trim().max(5000, "Description must be less than 5000 characters").optional(),
  url: z.string().trim().max(2000, "URL too long").optional().nullable().refine(
    (val) => !val || val === "" || /^https?:\/\/.+/.test(val),
    { message: "Please enter a valid URL (must start with http:// or https://)" }
  ),
});

interface EditCourseDialogProps {
  course: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCourseUpdated: () => void;
}

export function EditCourseDialog({ course, open, onOpenChange, onCourseUpdated }: EditCourseDialogProps) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("published");
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    if (course) {
      setTitle(course.title || "");
      setDescription(course.description || "");
      setUrl(course.url || course.courseUrl || "");
      setThumbnailUrl(course.thumbnailUrl || "");
      setStatus(course.status === "draft" ? "draft" : "published");
    }
  }, [course]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;

    const validation = courseSchema.safeParse({
      title,
      description: description || undefined,
      url: url?.trim() ? url.trim() : undefined,
    });

    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.issues[0].message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      await coursesAPI.update(
        course.id || course._id,
        {
          title: validation.data.title,
          description: validation.data.description || null,
          status,
          url: validation.data.url || null,
          thumbnailUrl: thumbnailUrl?.trim() ? thumbnailUrl.trim() : null
        }
      );

      toast({
        title: "Success!",
        description: "Course updated successfully",
      });

      onOpenChange(false);
      onCourseUpdated();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update course",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Course</DialogTitle>
          <DialogDescription>
            Update your course details
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t('course.title')} *</Label>
            <Input
              id="title"
              placeholder={t('course.placeholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('course.description')}</Label>
            <Textarea
              id="description"
              placeholder={t('course.describeLearning')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={4}
              maxLength={5000}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">Course Link (optional)</Label>
            <Input
              id="url"
              placeholder="https://example.com/course-info"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="thumbnailUrl">Course Preview Image URL</Label>
            <Input
              id="thumbnailUrl"
              placeholder="https://example.com/preview-image.jpg"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">{t('course.status')}</Label>
            <Select value={status} onValueChange={(value: "draft" | "published") => setStatus(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">{t('courses.draft')}</SelectItem>
                <SelectItem value="published">{t('courses.published')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Course"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
