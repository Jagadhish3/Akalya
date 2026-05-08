import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { mockTestsAPI } from "@/lib/api";
import { ClipboardList, Clock, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TestSeries({ embedded }: { embedded?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tests, setTests] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    mockTestsAPI.getAll().then((data) => {
      if (mounted) {
        if (Array.isArray(data) && data.length > 0) {
          setTests(data);
        } else {
          setTests(STATIC_MOCK_TESTS);
        }
      }
    }).catch(() => {
      if (mounted) setTests(STATIC_MOCK_TESTS);
    });

    if (user) {
      mockTestsAPI.getMyAttempts().then((data) => {
        if (mounted) setAttempts(Array.isArray(data) ? data : []);
      }).catch(() => {});
    }
    setLoading(false);
    return () => { mounted = false; };
  }, [user]);

  const content = (
    <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Competitive Test Series</h1>
        <p className="text-muted-foreground mb-6">
          Full-length and subject-wise mock tests for entrance exams. Timer, score analysis and weak topic detection. Sign in to attempt and save history.
        </p>
        {loading ? (
          <p>Loading...</p>
        ) : tests.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No mock tests available yet. Check back later or contact admin.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            {tests.map((t) => (
              <Card key={t._id || t.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <ClipboardList className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-lg">{t.title}</CardTitle>
                  <CardDescription>
                    {t.examName && <span>{t.examName}</span>}
                    {t.type && <span className="ml-1"> • {t.type}</span>}
                    {t.durationMinutes && (
                      <span className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" /> {t.durationMinutes} min
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                  {user ? (
                    <Button onClick={() => navigate(embedded ? `/dashboard/student/career-gateway/test-series/${t._id || t.id}` : `/test-series/${t._id || t.id}`)}>Start test</Button>
                  ) : (
                    <Button variant="outline" onClick={() => navigate("/auth")}>Login to attempt</Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {user && attempts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" /> Your attempts</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {attempts.slice(0, 10).map((a) => (
                  <li key={a._id}>
                    {a.mockTestId?.title || "Test"}: {a.score}/{a.totalMarks} – {a.weakTopics?.length ? `Weak: ${a.weakTopics.join(", ")}` : "—"}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
  );
  if (embedded) return content;
  return <AppLayout>{content}</AppLayout>;
}
