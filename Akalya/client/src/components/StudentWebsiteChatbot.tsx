import { useMemo, useState } from "react";
import { Bot, MessageSquare, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ChatMessage = { role: "user" | "bot"; text: string };

const WEBSITE_SCOPE_NOTE =
  "I can help only with Akalya website features like scholarships, entrance exams, courses, assignments, practice, test series, locker, and dashboard navigation.";

function getWebsiteReply(query: string): string {
  const q = query.toLowerCase();
  if (!q.trim()) return "Please type your question.";

  // Greetings
  if (q.includes("hello") || q.includes("hi ") || q.trim() === "hi" || q.includes("hey")) {
    return "Hello! I am the Student Help Bot. I can guide you on how to use the Akalya website features like Scholarships, Exams, Jobs, and Courses.";
  }

  if (q.includes("scholarship")) {
    return "Open Career Gateway -> Scholarships from your student dashboard to see eligibility and deadline details.";
  }
  if (q.includes("entrance") || q.includes("exam")) {
    return "Open Career Gateway -> Entrance Exams to view exam info pages and details.";
  }
  if (q.includes("assignment")) {
    return "Go to Student Dashboard -> Assignments to view pending tasks and submit your work.";
  }
  if (q.includes("course") || q.includes("enroll") || q.includes("learn") || q.includes("class")) {
    return "Use Student Dashboard -> Explore to enroll in courses, then check My Courses to continue learning.";
  }
  if (q.includes("practice") || q.includes("mock") || q.includes("test")) {
    return "Use Career Gateway -> Practice or Test Series for MCQs, timed tests, and score review.";
  }
  if (q.includes("locker") || q.includes("certificate") || q.includes("upload") || q.includes("document")) {
    return "Use Career Gateway -> My Locker to upload and manage your certificates securely.";
  }
  if (q.includes("login") || q.includes("sign in") || q.includes("password") || q.includes("profile")) {
    return "You can update your profile and password from the Profile section in the left sidebar. If you forgot your password, contact your administrator.";
  }
  if (q.includes("job") || q.includes("career") || q.includes("roadmap") || q.includes("work")) {
    return "Use Career Gateway to explore 'Jobs After 10th' and 'Jobs After 12th', or use the Career Roadmap generator.";
  }
  if (q.includes("certification") || q.includes("skill")) {
    return "Open Career Gateway -> Certifications to explore government and professional courses like ITI, PMKVY, and Coursera.";
  }
  if (q.includes("contact") || q.includes("support") || q.includes("help")) {
    return "For direct support, you can open the Contact page from the website navigation.";
  }
  if (q.includes("about") || q.includes("akalya") || q.includes("this website")) {
    return "Akalya is a platform for rural student empowerment. You can find scholarships, exams, jobs, and courses here.";
  }
  if (q.includes("notification") || q.includes("alert") || q.includes("message")) {
    return "You can check your Notifications from the left sidebar to stay updated on new assignments, classes, and course enrollments.";
  }
  if (q.includes("attendance")) {
    return "Check your Attendance section on the Dashboard to see your present/absent history for all enrolled courses.";
  }
  if (q.includes("doubt") || q.includes("query") || q.includes("question") || q.includes("ask")) {
    return "Use the Doubt Clearance section on your Dashboard to ask questions to your teachers and view responses.";
  }
  if (q.includes("progress") || q.includes("grade") || q.includes("score")) {
    return "Open the Progress section to track your overall grades and course completion status.";
  }

  // Unrelated questions fallback
  return "Please ask questions related to this website only. I can help you with features like scholarships, exams, courses, attendance, doubt clearance, and jobs.";
}

export function StudentWebsiteChatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "bot", text: "Hi! Ask me about Akalya website features and navigation." },
  ]);
  const [input, setInput] = useState("");

  const canSend = useMemo(() => input.trim().length > 0, [input]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;

    const reply = getWebsiteReply(text);
    setMessages((prev) => [...prev, { role: "user", text }, { role: "bot", text: reply }]);
    setInput("");
  };

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Student Help Bot
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="max-h-56 overflow-y-auto space-y-2 rounded-md border p-3 bg-muted/30">
          {messages.map((msg, index) => (
            <div key={`${msg.role}-${index}`} className={msg.role === "user" ? "text-right" : "text-left"}>
              <span
                className={`inline-flex max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-background border"
                }`}
              >
                {msg.role === "bot" && <Bot className="h-3.5 w-3.5 mr-1 mt-0.5 shrink-0" />}
                {msg.text}
              </span>
            </div>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this website..."
          />
          <Button type="submit" size="icon" disabled={!canSend} aria-label="Send message">
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">{WEBSITE_SCOPE_NOTE}</p>
      </CardContent>
    </Card>
  );
}
