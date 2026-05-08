import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { mockTestsAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle, Brain, Trophy, AlertTriangle, ChevronRight, BarChart3, Target } from "lucide-react";

export default function TestSeriesAttempt() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const backPath = location.pathname.includes("career-gateway") ? "/dashboard/student/career-gateway/test-series" : "/test-series";
  const { toast } = useToast();
  const [test, setTest] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState<any>(null);

  useEffect(() => {
    if (!id || !user) return;
    mockTestsAPI.getById(id).then(setTest).catch(() => setTest(null));
  }, [id, user]);

  useEffect(() => {
    if (!test?.durationMinutes) return;
    setTimeLeft(test.durationMinutes * 60);
  }, [test]);

  useEffect(() => {
    if (submitted || timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [submitted, timeLeft]);

  const handleSubmit = async () => {
    if (!test || !user) return;
    const answerList = (test.questions || []).map((q: any) => ({
      questionId: q.id || q._id,
      selectedIndex: answers[q.id || q._id] ?? -1,
    }));
    try {
      const result = await mockTestsAPI.submit({
        mockTestId: test._id || test.id,
        answers: answerList,
        timeSpentSeconds: (test.durationMinutes || 0) * 60 - timeLeft,
      });
      setSubmitted(result);
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Submit failed" });
    }
  };

  if (!user) {
    navigate("/auth");
    return null;
  }
  if (!test) return <AppLayout><div className="container py-8">Loading...</div></AppLayout>;

  const questions = test.questions || [];
  const answeredCount = Object.keys(answers).length;
  const progressPercentage = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;
  
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-b from-blue-50/50 to-white dark:from-slate-950 dark:to-slate-900 pb-12">
        {!submitted && (
          <div className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/70 dark:bg-slate-950/70 border-b border-border/50 shadow-sm transition-all duration-300">
            <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
                  {test.title}
                </h1>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Target className="h-4 w-4" /> {test.examName || "Entrance Exam"} Mock Test
                </p>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-end">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Time Remaining</span>
                  <div className={`flex items-center gap-2 font-mono text-xl md:text-2xl font-bold ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-primary'}`}>
                    <Clock className="h-5 w-5" />
                    {formatTime(timeLeft)}
                  </div>
                </div>
                <Button onClick={handleSubmit} size="lg" className="shadow-lg hover:shadow-primary/25 transition-all">
                  Submit Test <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
            <Progress value={progressPercentage} className="h-1.5 rounded-none bg-blue-100 dark:bg-slate-800" />
          </div>
        )}

        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {!submitted ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between text-sm font-medium text-muted-foreground mb-4">
                <span>{answeredCount} of {questions.length} Answered</span>
                <span>{questions.length - answeredCount} Remaining</span>
              </div>
              
              {questions.map((q: any, i: number) => {
                const isAnswered = answers[q.id || q._id] !== undefined;
                return (
                  <Card 
                    key={q.id || q._id} 
                    className={`overflow-hidden transition-all duration-300 border ${isAnswered ? 'border-primary/30 shadow-md bg-white dark:bg-slate-900' : 'border-border/50 hover:border-primary/20 bg-white/50 dark:bg-slate-900/50'}`}
                  >
                    <CardHeader className="bg-muted/30 pb-4 border-b border-border/50">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                          {i + 1}
                        </div>
                        <CardTitle className="text-lg leading-relaxed font-medium pt-1">
                          {q.question}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <RadioGroup
                        value={String(answers[q.id || q._id] ?? "")}
                        onValueChange={(v) => setAnswers((prev) => ({ ...prev, [q.id || q._id]: parseInt(v, 10) }))}
                        className="space-y-3"
                      >
                        {(q.options || []).map((opt: string, idx: number) => (
                          <div 
                            key={idx} 
                            className={`flex items-start space-x-3 space-y-0 rounded-lg border p-4 transition-all hover:bg-muted/50 cursor-pointer ${
                              answers[q.id || q._id] === idx ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-transparent'
                            }`}
                            onClick={() => setAnswers((prev) => ({ ...prev, [q.id || q._id]: idx }))}
                          >
                            <RadioGroupItem value={String(idx)} id={`t-${q.id}-${idx}`} className="mt-1" />
                            <Label htmlFor={`t-${q.id}-${idx}`} className="flex-1 cursor-pointer text-base leading-relaxed font-normal">
                              {opt}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </CardContent>
                  </Card>
                );
              })}
              
              <div className="flex justify-center pt-6 pb-12">
                <Button size="lg" onClick={handleSubmit} className="w-full sm:w-auto px-12 text-lg shadow-xl hover:shadow-primary/30 transition-all h-14">
                  <CheckCircle className="mr-2 h-5 w-5" /> Submit Final Answers
                </Button>
              </div>
            </div>
          ) : (
            <div className="animate-in zoom-in-95 duration-500">
              <Card className="border-0 shadow-2xl overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                <div className="h-32 bg-gradient-to-r from-primary via-blue-500 to-indigo-600 relative flex items-center justify-center">
                  <div className="absolute -bottom-10 w-20 h-20 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-lg">
                    <Trophy className="h-10 w-10 text-yellow-500" />
                  </div>
                </div>
                
                <CardHeader className="text-center pt-14 pb-2">
                  <CardTitle className="text-3xl font-bold">Test Completed</CardTitle>
                  <CardDescription className="text-lg">Here is your detailed performance analysis</CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-8 p-6 md:p-10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-primary/5 border-primary/10 shadow-none">
                      <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                        <BarChart3 className="h-8 w-8 text-primary mb-3" />
                        <p className="text-sm text-muted-foreground font-medium mb-1">Total Score</p>
                        <div className="text-4xl font-bold text-primary">
                          {submitted.score} <span className="text-xl text-muted-foreground font-normal">/ {submitted.totalMarks}</span>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/50 shadow-none md:col-span-2">
                      <CardContent className="p-6 h-full flex flex-col justify-center">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-400">
                            <Brain className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg mb-2">Performance Insights</h3>
                            <p className="text-muted-foreground">
                              {submitted.improvementSuggestions || "Keep practicing! Regular mock tests are key to improving your speed and accuracy."}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {submitted.weakTopics && submitted.weakTopics.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-6">
                      <h3 className="font-semibold text-lg flex items-center gap-2 mb-4 text-amber-800 dark:text-amber-500">
                        <AlertTriangle className="h-5 w-5" /> Topics to Review
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {submitted.weakTopics.map((topic: string, i: number) => (
                          <span key={i} className="px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400 rounded-full text-sm font-medium">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center pt-4">
                    <Button size="lg" onClick={() => navigate(backPath)} className="px-8 shadow-md">
                      Return to Test Series
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
