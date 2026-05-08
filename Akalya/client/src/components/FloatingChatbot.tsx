import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Mic, Volume2, RotateCcw, ChevronRight, GraduationCap, Briefcase, Info, BookOpen, Map } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "./ui/card";
import { chatAPI } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export const FloatingChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I am your Akalya Assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // Handle initialization of conversation
  useEffect(() => {
    if (isOpen && !conversationId) {
      const initChat = async () => {
        try {
          const conv = await chatAPI.createConversation("Help Session");
          setConversationId(conv._id || conv.id);
        } catch (err) {
          console.warn("Failed to create conversation history", err);
        }
      };
      initChat();
    }
  }, [isOpen, conversationId]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // API call with history
      const history = messages.slice(-5).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', content: m.content }));
      history.push({ role: 'user', content: text });

      const response = await chatAPI.chatAssistant(history, conversationId);
      
      const botMessage: Message = {
        role: "assistant",
        content: response.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);

      // Smart Navigation
      if (response.navigate) {
        toast({
          title: "Navigating...",
          description: `Taking you to ${response.navigate}`,
        });
        setTimeout(() => {
          navigate(response.navigate);
          setIsOpen(false);
        }, 1500);
      }

      // Text to Speech if enabled
      if (response.message) {
        speak(response.message);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to get response from AI",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Speech to Text (STT)
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Not Supported", description: "Your browser doesn't support speech recognition.", variant: "destructive" });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      handleSend(transcript);
    };

    recognition.start();
  };

  // Text to Speech (TTS)
  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    
    // Stop any current speaking
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-IN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const clearChat = () => {
    setMessages([{
      role: "assistant",
      content: "Chat cleared. How else can I help you?",
      timestamp: new Date(),
    }]);
    setConversationId(undefined);
  };

  const quickActions = [
    { icon: <GraduationCap className="h-4 w-4" />, label: "Scholarships", query: "Tell me about scholarships" },
    { icon: <Briefcase className="h-4 w-4" />, label: "Jobs", query: "What jobs are available?" },
    { icon: <BookOpen className="h-4 w-4" />, label: "Mock Tests", query: "How to take mock tests?" },
    { icon: <Map className="h-4 w-4" />, label: "Roadmap", query: "Show me my career roadmap" },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <Card className="w-[350px] sm:w-[400px] h-[500px] mb-4 shadow-2xl flex flex-col overflow-hidden border-primary/20 animate-in slide-in-from-bottom-5">
          <CardHeader className="bg-primary text-primary-foreground py-3 px-4 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1.5 rounded-lg">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">Akalya AI Assistant</CardTitle>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-[10px] opacity-80">Online</span>
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/10" onClick={clearChat}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/10" onClick={() => setIsOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-primary/10">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-muted text-foreground rounded-tl-none border border-border/50"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted p-3 rounded-2xl rounded-tl-none flex gap-1">
                  <span className="w-1.5 h-1.5 bg-foreground/30 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-foreground/30 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-foreground/30 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {messages.length < 3 && !isLoading && (
            <div className="px-4 pb-2">
              <p className="text-[10px] text-muted-foreground mb-2 uppercase font-bold tracking-wider">Quick Help</p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(action.query)}
                    className="flex items-center gap-2 p-2 text-left text-xs bg-muted/50 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors border border-border/50"
                  >
                    {action.icon}
                    <span className="truncate">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <CardFooter className="p-3 border-t bg-background">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="flex w-full items-center gap-2"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`h-9 w-9 rounded-full ${isListening ? "text-red-500 bg-red-100 animate-pulse" : "text-muted-foreground"}`}
                onClick={startListening}
              >
                <Mic className="h-5 w-5" />
              </Button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-muted/50 border-none focus:ring-0 focus:outline-none rounded-full px-4 py-2 text-sm"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading}
                className="h-9 w-9 rounded-full shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}

      {/* Floating Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="icon"
        className={`h-14 w-14 rounded-full shadow-lg transition-all duration-300 ${
          isOpen ? "rotate-90 bg-destructive hover:bg-destructive" : "hover:scale-110"
        }`}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </Button>
    </div>
  );
};
