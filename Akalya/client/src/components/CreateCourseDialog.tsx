import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { coursesAPI, lockerAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Plus, BookOpen, Loader2, FileCheck } from "lucide-react";
import { z } from "zod";

const courseSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().trim().max(5000, "Description must be less than 5000 characters").optional(),
  // url is optional; accept empty string and treat as undefined
  url: z.string().trim().max(2000, "URL too long").optional().nullable().refine(
    (val) => !val || val === "" || /^https?:\/\/.+/.test(val),
    { message: "Please enter a valid URL (must start with http:// or https://)" }
  ),
});

interface CreateCourseDialogProps {
  onCourseCreated: () => void;
}

export function CreateCourseDialog({ onCourseCreated }: CreateCourseDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState(""); // NEW
  const [thumbnailUrl, setThumbnailUrl] = useState(""); // NEW: Course Preview Image
  // Default to published so students see the course immediately in "Explore Courses"
  const [status, setStatus] = useState<"draft" | "published">("published");
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate input (normalize empty string to undefined)
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
      // Pass url and thumbnailUrl as arguments
      await coursesAPI.create(
        validation.data.title,
        validation.data.description || null,
        status,
        validation.data.url || null,
        thumbnailUrl?.trim() ? thumbnailUrl.trim() : null
      );

      toast({
        title: "Success!",
        description: "Course created successfully",
      });

      setTitle("");
      setDescription("");
      setUrl(""); // reset
      setThumbnailUrl(""); // reset
      setStatus("published");
      setOpen(false);
      onCourseCreated();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create course",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {t('courses.create')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{t('course.create')}</DialogTitle>
          <DialogDescription>
            {t('course.addCourse')}
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('course.creating') : t('course.createCourse')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
