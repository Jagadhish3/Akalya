import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PlayCircle, CheckCircle2 } from "lucide-react";
import { classesAPI, enrollmentsAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";

interface CourseLecturesDialogProps {
  courseId: string | null;
  onClose: () => void;
  onProgressUpdated: () => void; // to refresh dashboard stats
  isTeacherView?: boolean;
}

export function CourseLecturesDialog({ courseId, onClose, onProgressUpdated, isTeacherView = false }: CourseLecturesDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [courseClasses, setCourseClasses] = useState<any[]>([]);
  const [enrollment, setEnrollment] = useState<any>(null);

  useEffect(() => {
    if (!courseId || !user) return;
    let mounted = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch classes for the course
        const classesForCourse = await classesAPI.getAll({ courseId });
        if (!mounted) return;
        setCourseClasses(Array.isArray(classesForCourse) ? classesForCourse : []);

        // Fetch student's enrollment for this course to get completedUnits
        const enrs: any = await enrollmentsAPI.getAll();
        const myEnrs = Array.isArray(enrs) ? enrs : [];
        const currentEnr = myEnrs.find((enr: any) => {
          const cIdRaw = enr.courseId ?? enr.course ?? enr.course_id;
          const cIdStr = String(typeof cIdRaw === 'object' && cIdRaw !== null ? (cIdRaw._id ?? cIdRaw.id) : cIdRaw);
          return cIdStr === courseId;
        });

        if (currentEnr) {
          setEnrollment(currentEnr);
        }
      } catch (err) {
        console.error("Failed to load course lectures", err);
        toast({ title: "Error", description: "Failed to load lectures", variant: "destructive" });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();

    return () => { mounted = false; };
  }, [courseId, user, toast]);

  const completedUnits: number[] = enrollment?.completedUnits || [];

  const handleToggleComplete = async (unitNumber: number, isCompleted: boolean) => {
    if (!enrollment) return;
    
    try {
      let newCompleted = [...completedUnits];
      if (isCompleted) {
        if (!newCompleted.includes(unitNumber)) newCompleted.push(unitNumber);
      } else {
        newCompleted = newCompleted.filter(u => u !== unitNumber);
      }

      // Calculate progress percentage
      const totalUnits = 6;
      const progress = Math.round((newCompleted.length / totalUnits) * 100);

      // Optimistic update
      setEnrollment({ ...enrollment, completedUnits: newCompleted, progress });

      // Save to backend
      await enrollmentsAPI.update(String(enrollment._id ?? enrollment.id), {
        completedUnits: newCompleted,
        progress
      });

      onProgressUpdated(); // trigger refresh of progress in parent
    } catch (err) {
      console.error("Failed to update unit completion", err);
      toast({ title: "Error", description: "Failed to save progress", variant: "destructive" });
      
      // Revert optimistic update (simple reload)
      const enrs: any = await enrollmentsAPI.getAll();
      const currentEnr = (Array.isArray(enrs) ? enrs : []).find((enr: any) => {
        const cIdRaw = enr.courseId ?? enr.course ?? enr.course_id;
        const cIdStr = String(typeof cIdRaw === 'object' && cIdRaw !== null ? (cIdRaw._id ?? cIdRaw.id) : cIdRaw);
        return cIdStr === courseId;
      });
      if (currentEnr) setEnrollment(currentEnr);
    }
  };

  const handleWatchVideo = (url: string) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Build 6 units
  const units = [1, 2, 3, 4, 5, 6];

  return (
    <Dialog open={!!courseId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('units.title')}</DialogTitle>
          <DialogDescription>{t('units.description')}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">{t('common.loading')}</div>
        ) : (
          <div className="space-y-4 mt-4">
            {units.map((unitNum) => {
              // Find if teacher uploaded a video for this unit
              const uploadedClass = courseClasses.find(c => Number(c.unit) === unitNum);
              const isCompleted = completedUnits.includes(unitNum);

              return (
                <div key={unitNum} className={`flex items-center justify-between p-4 border rounded-lg ${isCompleted ? "bg-primary/5 border-primary/20" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">{t('units.unit')} {unitNum}</span>
                      {uploadedClass ? (
                        <span className="text-sm text-muted-foreground">{uploadedClass.title}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">{t('units.noVideo')}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {uploadedClass ? (
                      !isTeacherView ? (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => handleWatchVideo(uploadedClass.videoUrl || uploadedClass.url || uploadedClass.src)}
                          >
                            <PlayCircle className="w-4 h-4" /> {t('units.watch')}
                          </Button>
                          <div className="flex items-center gap-2">
                            <Checkbox 
                              id={`unit-${unitNum}`} 
                              checked={isCompleted} 
                              onCheckedChange={(checked) => handleToggleComplete(unitNum, checked as boolean)}
                            />
                            <label htmlFor={`unit-${unitNum}`} className="text-sm font-medium leading-none cursor-pointer">
                              {t('units.completed')}
                            </label>
                          </div>
                        </>
                      ) : (
                        <span className="text-xs px-3 py-1 bg-primary/10 text-primary rounded-full font-medium">{t('units.uploaded')}</span>
                      )
                    ) : (
                      <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded">{t('units.pending')}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
