import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { classesAPI, enrollmentsAPI } from "@/lib/api";

interface Props {
  courseId?: string;
  courses?: any[];
  onClassCreated?: () => void;
}

export function CreateClassDialog({ courseId, courses = [], onClassCreated }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classType, setClassType] = useState<'live' | 'recorded'>('recorded');

  // visibility mode: 'public' => all enrolled students for the course can see it
  // 'specific' => only selected student IDs (or manual IDs) will see it
  const [visibilityMode, setVisibilityMode] = useState<'public' | 'specific'>('public');

  // students pulled from enrollments for the given course (friendly labels)
  const [courseStudents, setCourseStudents] = useState<{ id: string; label: string }[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [manualIds, setManualIds] = useState<string>(""); // fallback comma-separated ids

  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState("");
  const [unit, setUnit] = useState<number>(1);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courseId || "");
  const [loading, setLoading] = useState(false);

  // keep selectedCourseId in sync with courses prop if it's empty
  useEffect(() => {
    if (!selectedCourseId && courses.length > 0) {
      setSelectedCourseId(String(courses[0].id ?? courses[0]._id ?? ""));
    }
  }, [courses, selectedCourseId]);

  // fetch enrolled students for the selected course
  useEffect(() => {
    if (!open || !selectedCourseId) return;
    let mounted = true;
    (async () => {
      try {
        const enrs: any[] = Array.isArray(await enrollmentsAPI.getAll({ courseId: selectedCourseId })) ? await enrollmentsAPI.getAll({ courseId: selectedCourseId }) : [];
        if (!mounted) return;
        let students = enrs.map((enr) => {
          const raw = enr.student ?? enr.studentId ?? enr.user ?? enr.userId ?? null;
          if (!raw) return null;
        
          if (typeof raw === "object") {
            return {
              id: String(raw._id ?? raw.id),
              label: raw.fullName ?? raw.name ?? raw.email ?? String(raw._id ?? raw.id).slice(0, 8),
            };
          }
        
          return { id: String(raw), label: String(raw).slice(0, 8) };
        }).filter(Boolean);
        
        students = Array.from(new Map(students.map(s => [s.id, s])).values());
        setCourseStudents(students);
      } catch (err) {
        console.error("failed loading course students", err);
        setCourseStudents([]);
      }
    })();

    return () => { mounted = false; };
  }, [open, selectedCourseId]);

  const reset = () => {
    setTitle("");
    setDescription("");
    setClassType('recorded');
    setScheduledAt("");
    setVideoUrl("");
    setUnit(1);
    setVisibilityMode('public');
    setSelectedStudentIds([]);
    setManualIds("");
  };

  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const parseManualIds = (text: string) => {
    return text.split(",").map(s => s.trim()).filter(Boolean);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim()) {
      toast({ title: "Validation", description: "Please enter a title for the class.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const explicitStudentIds = Array.from(new Set([
        ...selectedStudentIds,
        ...parseManualIds(manualIds),
      ])).filter(Boolean);

      const payload: any = {
        courseId: selectedCourseId || undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        classType,
        scheduledAt: scheduledAt || undefined,
        videoUrl: videoUrl?.trim() || undefined,
        unit,
        isPublic: visibilityMode === 'public',
        hasVideo: Boolean(videoUrl && videoUrl.trim()),
        // only include enrolledStudents when specific mode and at least one id provided
        enrolledStudents: visibilityMode === 'specific' && explicitStudentIds.length ? explicitStudentIds : undefined,
      };

      await classesAPI.create(payload);

      toast({
        title: "Created",
        description: payload.isPublic ? "Public class created. Students will see it." : `Class created for ${payload.enrolledStudents?.length ?? 0} student(s).`,
      });

      onClassCreated?.();
      setOpen(false);
      reset();
    } catch (err: any) {
      console.error("CreateClassDialog.create error", err);
      toast({ title: "Error", description: err?.message ?? "Failed to create class.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">Create Class</Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Class</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {courses.length > 0 && (
            <div>
              <label className="text-sm font-medium">Select Course</label>
              <select 
                className="w-full rounded-md border px-3 py-2 mt-1" 
                value={selectedCourseId} 
                onChange={(e) => setSelectedCourseId(e.target.value)}
              >
                {courses.map(c => (
                  <option key={String(c.id ?? c._id)} value={String(c.id ?? c._id)}>
                    {c.title ?? c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Week 1: Introduction" />
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" rows={3} />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium">Type</label>
              <select value={classType} onChange={(e) => setClassType(e.target.value as any)} className="w-full rounded-md border px-3 py-2">
                <option value="recorded">Recorded</option>
                <option value="live">Live</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium">Unit (1-6)</label>
              <select value={unit} onChange={(e) => setUnit(Number(e.target.value))} className="w-full rounded-md border px-3 py-2">
                {[1, 2, 3, 4, 5, 6].map(u => (
                  <option key={u} value={u}>Unit {u}</option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium">Scheduled at (optional)</label>
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Video URL (optional)</label>
            <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." />
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Visibility</label>

            <div className="flex items-center gap-4 mb-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="visibility"
                  checked={visibilityMode === 'public'}
                  onChange={() => { setVisibilityMode('public'); setSelectedStudentIds([]); setManualIds(""); }}
                />
                <span className="text-sm">Public to enrolled students</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="visibility"
                  checked={visibilityMode === 'specific'}
                  onChange={() => setVisibilityMode('specific')}
                />
                <span className="text-sm">Visible to specific students</span>
              </label>
            </div>

            {visibilityMode === 'specific' && (
              <div className="p-3 border rounded-md bg-muted/5">
                <p className="text-sm font-medium mb-2">Restrict visibility to specific students</p>

                {courseStudents.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-2 mb-2">
                    {courseStudents.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={selectedStudentIds.includes(s.id)} onChange={() => toggleSelectStudent(s.id)} className="h-4 w-4" />
                        <span>{s.label}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground mb-2">No enrollment list available for this course (or none found). You can paste student IDs manually below.</div>
                )}

                <div>
                  <label className="text-sm">Manual student IDs (comma separated)</label>
                  <Textarea value={manualIds} onChange={(e) => setManualIds(e.target.value)} rows={2} placeholder="stu123, stu456, 60c8e..." />
                  <p className="text-xs text-muted-foreground mt-1">IDs will be matched as strings. If both checkboxes and manual IDs are present they are combined.</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setOpen(false); reset(); }} type="button">Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Class"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateClassDialog;
