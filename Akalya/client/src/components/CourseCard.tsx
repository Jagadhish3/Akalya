// src/components/CourseCard.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Play, Plus, Clock, Tag } from "lucide-react";

interface Course {
  id?: string;
  title?: string;
  description?: string;
  status?: string;
  teacherName?: string;
  studentsCount?: number;
  duration?: string; // e.g. "3h 20m"
  thumbnailUrl?: string | null;
  tags?: string[];
  url?: string | null;
}

interface Props {
  course: Course;
  isEnrolled?: boolean;
  onEnroll?: (courseId: string) => void;
  onStartLearning?: (courseId: string) => void;
  onManage?: () => void;
  onDelete?: (courseId: string) => void;
  onViewCourse?: (courseId: string) => void;
  canDelete?: boolean;
  className?: string;
}

export const CourseCard: React.FC<Props> = ({
  course,
  isEnrolled = false,
  onEnroll,
  onStartLearning,
  onManage,
  onDelete,
  onViewCourse,
  canDelete = false,
  className = "",
}) => {
  const id = String(course.id ?? "");
  const title = course.title ?? "Untitled course";
  const desc = course.description ?? "No description available.";
  const students = course.studentsCount ?? 0;
  const duration = course.duration ?? "";
  const thumbnail = course.thumbnailUrl ?? null;
  const tags = Array.isArray(course.tags) ? course.tags : [];

  return (
    <Card className={`overflow-hidden shadow-sm hover:shadow-md transition-shadow ${className}`}>
      {/* Thumbnail + badge row */}
      <div className="relative bg-surface/50">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-40 object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-40 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">No preview</div>
              <div className="text-sm font-semibold mt-1">{course.status ?? "Course"}</div>
            </div>
          </div>
        )}

        {/* badge */}
        <div className="absolute top-3 left-3">
          {isEnrolled ? (
            <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">Enrolled</span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">Open</span>
          )}
        </div>

        {/* optional duration */}
        {duration && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/50 text-white text-xs px-2 py-1 rounded">
            <Clock className="h-3 w-3" /> <span className="text-xs">{duration}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm sm:text-base font-semibold line-clamp-2">{title}</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1 line-clamp-3">{desc}</CardDescription>

            {/* tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {tags.slice(0, 3).map((t) => (
                  <span key={t} className="text-xs bg-muted/10 px-2 py-1 rounded-md text-muted-foreground">{t}</span>
                ))}
                {tags.length > 3 && <span className="text-xs text-muted-foreground">+{tags.length - 3}</span>}
              </div>
            )}
          </div>

          {/* metadata column */}
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{students}</span>
            </div>

            {/* small teacher label if present */}
            {course.teacherName && (
              <div className="text-xs text-muted-foreground">By {course.teacherName}</div>
            )}
          </div>
        </div>
      </CardContent>

      {/* Actions */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between gap-3">
          <a
            href={course.url ?? "#"}
            onClick={(e) => { 
              if (!course.url) {
                e.preventDefault();
                if (onViewCourse) onViewCourse(id);
              }
            }}
            className="text-sm text-primary underline cursor-pointer"
          >
            View course
          </a>

          <div className="flex items-center gap-2">
            {isEnrolled ? (
              onStartLearning ? (
                <Button size="sm" onClick={() => onStartLearning(id)}>
                  <Play className="mr-2 h-4 w-4" />
                  Start Learning
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled>
                  Enrolled
                </Button>
              )
            ) : (
              onEnroll && (
                <Button size="sm" variant="default" onClick={() => onEnroll(id)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Enroll
                </Button>
              )
            )}

            {canDelete && onDelete && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onDelete(id)}
                title="Delete course"
              >
                Delete
              </Button>
            )}

            {onManage && (
              <Button size="sm" variant="outline" onClick={() => onManage()}>
                Manage
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CourseCard;
