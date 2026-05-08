import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { preparationResourcesAPI } from "@/lib/api";
import { BookOpen, Youtube, FileText, Calendar, Map, Lightbulb, ExternalLink } from "lucide-react";

const TYPE_ICONS: Record<string, React.ElementType> = {
  book: BookOpen,
  youtube: Youtube,
  govt: FileText,
  previous_paper: FileText,
  timetable: Calendar,
  roadmap: Map,
  strategy: Lightbulb,
};
const TYPE_LABELS: Record<string, string> = {
  book: "Books",
  youtube: "YouTube channels",
  govt: "Govt resources",
  previous_paper: "Previous papers",
  timetable: "Study timetable",
  roadmap: "Roadmap",
  strategy: "Strategy tips",
};

export default function PreparationResources({ embedded }: { embedded?: boolean }) {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    const params = typeFilter ? { type: typeFilter } : undefined;
    
    // Fetch from API
    preparationResourcesAPI.getAll(params).then((data) => {
      if (mounted) {
        if (Array.isArray(data) && data.length > 0) {
          setList(data);
        } else {
          // Fallback to static data if API returns empty
          const filteredStatic = typeFilter 
            ? STATIC_PREPARATION_RESOURCES.filter(r => r.type === typeFilter)
            : STATIC_PREPARATION_RESOURCES;
          setList(filteredStatic);
        }
      }
    }).catch(() => {
      // Fallback to static data on error
      if (mounted) {
        const filteredStatic = typeFilter 
          ? STATIC_PREPARATION_RESOURCES.filter(r => r.type === typeFilter)
          : STATIC_PREPARATION_RESOURCES;
        setList(filteredStatic);
      }
    }).finally(() => { if (mounted) setLoading(false); });
    
    return () => { mounted = false; };
  }, [typeFilter]);

  const content = (
    <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Preparation Resources</h1>
          <p className="text-muted-foreground">
            Books, free YouTube channels, government resources, previous papers, study timetables, roadmaps and strategy tips for entrance exams.
          </p>
        </div>
        <div className="mb-6">
          <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : list.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No resources found. Try a different filter.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((r) => {
              const Icon = TYPE_ICONS[r.type] || BookOpen;
              return (
                <Card key={r._id || r.id} className="flex flex-col">
                  <CardHeader className="pb-2">
                    <Icon className="h-8 w-8 text-primary mb-2" />
                    <CardTitle className="text-lg">{r.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{r.description}</CardDescription>
                    {r.type && <span className="text-xs text-muted-foreground">{TYPE_LABELS[r.type] || r.type}</span>}
                  </CardHeader>
                  <CardContent className="mt-auto">
                    {r.url && (
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm flex items-center gap-1 hover:underline">
                        <ExternalLink className="h-3 w-3" /> Open resource
                      </a>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
  );
  if (embedded) return content;
  return <AppLayout>{content}</AppLayout>;
}
