import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Clock, CheckCircle, Award, History } from "lucide-react";
import { Badge as UIBadge } from "@/components/ui/badge";

const CLASSES = [6, 7, 8, 9, 10, 11, 12];
const SUBJECTS = ["Mathematics", "Science", "Social Studies", "English", "Physics", "Chemistry", "Biology"];

const QUESTION_BANK: Record<string, Record<string, any[]>> = {
  10: {
    "Mathematics": [
      { id: "m1", question: "What is the value of π (pi) approximately?", options: ["3.14", "2.71", "1.61", "1.41"], correctIndex: 0 },
      { id: "m2", question: "If 2x = 10, what is the value of x?", options: ["2", "5", "10", "20"], correctIndex: 1 },
      { id: "m3", question: "What is the square root of 144?", options: ["10", "11", "12", "14"], correctIndex: 2 },
      { id: "m4", question: "An angle exactly equal to 90 degrees is called?", options: ["Acute angle", "Obtuse angle", "Right angle", "Straight angle"], correctIndex: 2 },
      { id: "m5", question: "What is the formula for the area of a circle?", options: ["2πr", "πr²", "πd", "2πr²"], correctIndex: 1 },
    ],
    "Science": [
      { id: "s1", question: "What is the chemical formula for water?", options: ["H2O", "CO2", "O2", "NaCl"], correctIndex: 0 },
      { id: "s2", question: "Which planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Saturn"], correctIndex: 1 },
      { id: "s3", question: "What is the powerhouse of the cell?", options: ["Nucleus", "Ribosome", "Mitochondria", "Chloroplast"], correctIndex: 2 },
      { id: "s4", question: "What gas do plants absorb during photosynthesis?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], correctIndex: 2 },
      { id: "s5", question: "Which of the following is a renewable energy source?", options: ["Coal", "Natural Gas", "Solar", "Petroleum"], correctIndex: 2 },
    ]
  }
};

const GENERIC_QUESTIONS = [
  { id: "g1", question: "Which direction does the sun rise?", options: ["North", "South", "East", "West"], correctIndex: 2 },
  { id: "g2", question: "How many days are in a standard leap year?", options: ["364", "365", "366", "367"], correctIndex: 2 },
  { id: "g3", question: "What is 15 + 25?", options: ["30", "40", "45", "50"], correctIndex: 1 },
  { id: "g4", question: "Which of these is a primary color?", options: ["Green", "Orange", "Red", "Purple"], correctIndex: 2 },
  { id: "g5", question: "How many continents are there on Earth?", options: ["5", "6", "7", "8"], correctIndex: 2 },
];

export default function Practice({ embedded }: { embedded?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [classLevel, setClassLevel] = useState<number>(10);
  const [subject, setSubject] = useState<string>("Mathematics");
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [timeSeconds, setTimeSeconds] = useState(0);
  const [submitted, setSubmitted] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    if (!user) return;
    const saved = localStorage.getItem(`practice_history_${user.id || user._id || "anon"}`);
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch (e) {}
    }
  }, [user]);

  const startPractice = () => {
    setLoading(true);
    setTimeout(() => {
      setQuestions([]);
      setAnswers({});
      setSubmitted(null);
      setTimeSeconds(0);
      setStarted(false);
      
      const qBank = QUESTION_BANK[String(classLevel)]?.[subject] || GENERIC_QUESTIONS;
      setQuestions(qBank);
      setStarted(true);
      setLoading(false);
    }, 500); // simulate brief loading
  };

  useEffect(() => {
    if (!started || submitted || questions.length === 0) return;
    const t = setInterval(() => setTimeSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [started, submitted, questions.length]);

  const handleSubmit = () => {
    if (!user) {
      toast({ title: "Login required", description: "Sign in to save your attempt." });
      return;
    }
    
    let correctCount = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correctIndex) {
        correctCount++;
      }
    });

    const total = questions.length;
    const percentage = (correctCount / total) * 100;
    
    let badgeText = "";
    let badgeColor = "";
    
    if (percentage === 100) { badgeText = "🏆 Gold Scholar"; badgeColor = "bg-yellow-500 hover:bg-yellow-600"; }
    else if (percentage >= 80) { badgeText = "🥈 Silver Achiever"; badgeColor = "bg-slate-400 hover:bg-slate-500"; }
    else if (percentage >= 60) { badgeText = "🥉 Bronze Learner"; badgeColor = "bg-amber-700 hover:bg-amber-800"; }
    else { badgeText = "💪 Keep Practicing"; badgeColor = "bg-blue-500 hover:bg-blue-600"; }

    const result = {
      _id: Date.now().toString(),
      classLevel,
      subject,
      correctCount,
      total,
      timeSpentSeconds: timeSeconds,
      badgeText,
      badgeColor,
      percentage
    };

    setSubmitted(result);
    
    const newHistory = [result, ...history];
    setHistory(newHistory);
    localStorage.setItem(`practice_history_${user.id || user._id || "anon"}`, JSON.stringify(newHistory));
    
    toast({ title: "Quiz Completed!", description: `You scored ${correctCount}/${total}.` });
  };

  if (!user) {
    const msg = (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Please log in as a student to attempt practice tests and save your performance history.</p>
          </CardContent>
        </Card>
      </div>
    );
    if (embedded) return msg;
    return <AppLayout>{msg}</AppLayout>;
  }

  const content = (
    <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Practice (Class 6–12)</h1>
        <p className="text-muted-foreground mb-6">MCQ-based practice with timer and auto evaluation. Earn badges based on your score!</p>

        {!started && !submitted && (
          <Card className="mb-6 border-primary/20 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> Select Practice Topic</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <Label>Class Level</Label>
                <Select value={String(classLevel)} onValueChange={(v) => setClassLevel(parseInt(v, 10))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASSES.map((c) => (
                      <SelectItem key={c} value={String(c)}>Class {c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={startPractice} disabled={loading} className="w-full sm:w-auto">
                {loading ? "Loading..." : "Start Practice"}
              </Button>
            </CardContent>
          </Card>
        )}

        {started && questions.length > 0 && !submitted && (
          <Card className="mb-6 shadow-md border-primary/20">
            <CardHeader className="bg-muted/30 pb-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Class {classLevel} - {subject}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Answer all {questions.length} questions</p>
                </div>
                <div className="flex items-center gap-2 text-primary font-mono bg-primary/10 px-3 py-1.5 rounded-md">
                  <Clock className="h-4 w-4" /> 
                  <span className="text-base font-semibold">
                    {Math.floor(timeSeconds / 60)}:{(timeSeconds % 60).toString().padStart(2, "0")}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-8">
                {questions.map((q, i) => (
                  <div key={q.id} className="space-y-3 p-4 bg-muted/20 rounded-lg border">
                    <p className="font-medium text-base"><span className="text-primary mr-1">Q{i + 1}.</span> {q.question}</p>
                    <RadioGroup
                      value={String(answers[q.id] ?? "")}
                      onValueChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: parseInt(v, 10) }))}
                      className="gap-3 mt-3"
                    >
                      {(q.options || []).map((opt: string, idx: number) => (
                        <div key={idx} className="flex items-center space-x-3 p-2 rounded hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value={String(idx)} id={`q-${q.id}-${idx}`} />
                          <Label htmlFor={`q-${q.id}-${idx}`} className="flex-1 cursor-pointer">{opt}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex justify-end">
                <Button size="lg" onClick={handleSubmit}>Submit Answers</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {submitted && (
          <Card className="mb-6 border-green-500/30 shadow-md">
            <CardHeader className="bg-green-500/5 pb-4 border-b border-green-500/20">
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle className="h-6 w-6" />
                Practice Completed!
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-6 items-center">
                <div className="space-y-4">
                  <div>
                    <p className="text-muted-foreground text-sm">Your Score</p>
                    <p className="text-4xl font-bold text-foreground mt-1">
                      {submitted.correctCount} <span className="text-2xl text-muted-foreground font-normal">/ {submitted.total}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Time Taken</p>
                    <p className="text-lg font-medium">{Math.floor((submitted.timeSpentSeconds) / 60)}m {(submitted.timeSpentSeconds % 60)}s</p>
                  </div>
                </div>
                
                <div className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-xl border">
                  <Award className="h-12 w-12 text-primary mb-3" />
                  <p className="text-sm text-muted-foreground mb-2">Achievement Unlocked</p>
                  <UIBadge className={`px-4 py-1.5 text-sm ${submitted.badgeColor}`}>
                    {submitted.badgeText}
                  </UIBadge>
                </div>
              </div>
              
              <div className="mt-8 flex gap-3">
                <Button onClick={() => { setSubmitted(null); setStarted(false); }}>Try another test</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {history.length > 0 && (
          <Card>
            <CardHeader className="pb-3 border-b mb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="h-5 w-5 text-muted-foreground" />
                Your Practice History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.slice(0, 5).map((h) => (
                  <div key={h._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-muted/20 rounded-md border text-sm">
                    <div className="space-y-1">
                      <p className="font-medium">Class {h.classLevel} – {h.subject}</p>
                      <p className="text-muted-foreground text-xs">Score: {h.correctCount}/{h.total} • Time: {Math.floor(h.timeSpentSeconds / 60)}m {h.timeSpentSeconds % 60}s</p>
                    </div>
                    <div className="mt-2 sm:mt-0">
                      <UIBadge className={`${h.badgeColor} text-xs`}>{h.badgeText}</UIBadge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
  );
  if (embedded) return content;
  return <AppLayout>{content}</AppLayout>;
}
