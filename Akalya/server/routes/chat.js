// server/routes/chat.js
import express from 'express';
// If your Node version doesn't have global fetch, uncomment the next line and install node-fetch
// import fetch from 'node-fetch';
import ChatConversation from '../models/ChatConversation.js';
import ChatMessage from '../models/ChatMessage.js';
import { authenticate } from '../middleware/auth.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
console.log('[chat router] loaded');

// Dev-only quick-check route (no auth). Remove after debug.
router.post('/assistant/noauth', (req, res) => {
  return res.json({ ok: true, note: 'assistant/noauth reachable' });
});

/* -------------------------
   Conversations
   ------------------------- */

// Get all conversations for user
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const conversations = await ChatConversation.find({ userId: req.user._id }).sort({ updatedAt: -1 });
    res.json(conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Create conversation
router.post('/conversations', authenticate, async (req, res) => {
  try {
    const { title } = req.body || {};
    const conversation = new ChatConversation({
      userId: req.user._id,
      title: title || 'New Conversation',
    });
    await conversation.save();
    res.status(201).json(conversation);
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// convenience test route (no auth) - keep or remove
router.post('/conversations/test-noauth', async (req, res) => {
  const { title } = req.body || {};
  return res.status(201).json({ _id: 'mock-id-123', title: title || 'test' });
});

/* -------------------------
   Messages
   ------------------------- */

// Save message to a conversation
router.post('/messages', authenticate, async (req, res) => {
  try {
    const { conversationId, role, content } = req.body || {};
    if (!conversationId || !role || !content) {
      return res.status(400).json({ error: 'Missing required fields: conversationId, role, content' });
    }

    const conversation = await ChatConversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    if (conversation.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const message = new ChatMessage({
      conversationId,
      userId: req.user._id,
      role,
      content,
    });

    await message.save();
    return res.status(201).json(message);
  } catch (err) {
    console.error('Save message error:', err);
    return res.status(500).json({ error: 'Failed to save message' });
  }
});

// Get messages for a conversation
router.get('/conversations/:conversationId/messages', authenticate, async (req, res) => {
  try {
    const conversationId = req.params.conversationId;
    const conversation = await ChatConversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    if (conversation.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const messages = await ChatMessage.find({ conversationId }).sort({ createdAt: 1 });
    return res.json(messages);
  } catch (err) {
    console.error('Get messages error:', err);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/* -------------------------
   Assistant (calls Gemini)
   ------------------------- */

// Load Knowledge Base
const kbPath = path.join(__dirname, '../data/knowledge_base.json');
let knowledgeBase = { faqs: [] };
try {
  if (fs.existsSync(kbPath)) {
    knowledgeBase = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
  }
} catch (err) {
  console.error('Failed to load knowledge base:', err);
}

// Simple semantic/keyword matcher
const matchKnowledgeBase = (query) => {
  const q = query.toLowerCase();
  for (const faq of knowledgeBase.faqs) {
    if (faq.keywords.some(k => q.includes(k.toLowerCase()))) {
      return faq;
    }
  }
  return null;
};

router.post('/assistant', authenticate, async (req, res) => {
  try {
    const { messages, conversationId } = req.body || {};
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.LOVABLE_API_KEY;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Invalid payload: messages must be a non-empty array' });
    }

    const lastUserMessage = messages[messages.length - 1].content;

    // 1. Try local Knowledge Base first
    const kbMatch = matchKnowledgeBase(lastUserMessage);
    if (kbMatch) {
      const responseText = kbMatch.answer;
      
      // Save to MongoDB if conversationId provided
      if (conversationId) {
        try {
          await new ChatMessage({ conversationId, role: 'user', content: lastUserMessage }).save();
          await new ChatMessage({ conversationId, role: 'assistant', content: responseText }).save();
        } catch (dbErr) {
          console.warn('Failed to save messages to DB:', dbErr);
        }
      }

      return res.json({ 
        message: responseText, 
        navigate: kbMatch.navigate,
        source: 'knowledge_base' 
      });
    }

    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your-lovable-api-key' || GEMINI_API_KEY.includes('insert')) {
      // 2. Fallback to Basic Rule-based matching if no AI key
      console.warn('GEMINI_API_KEY not configured. Using Basic Mode.');
      
      const basicResponses = [
        { keywords: ['help', 'what can you do', 'who are you'], reply: 'I am the Akalya Assistant. I can help you find scholarships, exams, jobs, and guide you through the website features even when my AI brain is in "Basic Mode"!' },
        { keywords: ['contact', 'support', 'email'], reply: 'You can contact our support team through the official portal or your institution coordinator.' },
        { keywords: ['hi', 'hello', 'hey'], reply: 'Hello! I am in Basic Mode because an AI API Key is not set, but I can still help you with website navigation!' },
      ];

      for (const br of basicResponses) {
        if (br.keywords.some(k => lastUserMessage.toLowerCase().includes(k))) {
          return res.json({ message: br.reply, source: 'basic_fallback' });
        }
      }

      return res.json({ 
        message: "I'm currently in 'Basic Mode' because a Gemini API Key is not configured in the server's .env file. Please add a valid GEMINI_API_KEY to see my full AI potential! \n\nHowever, I can still answer questions about Scholarships, Exams, and Jobs if you use those keywords.",
        source: 'unconfigured_warning'
      });
    }

    const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';
    
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    const systemInstruction = `
      You are the Akalya Assistant, a specialized AI for rural Indian students.
      
      STRICT DOMAIN CONSTRAINTS:
      1. ONLY answer questions about the Akalya website (Scholarships, Exams, Jobs, Practice Tests).
      2. ONLY answer academic questions for Class 1 to 12.
      3. REJECT any non-educational topics (movies, gossip, etc.).
      
      COMMUNICATION STYLE (CRITICAL):
      - Use VERY simple, clear, and easy language.
      - Avoid complex formulas and technical jargon unless specifically asked.
      - Use real-life analogies that a rural student can understand.
      - Keep your answers short and direct.
      - For academic questions, provide a "Simple Summary" first.
      
      Response Format:
      - Start with a direct, simple answer.
      - Use bullet points for clarity.
      - End by asking if they want to see a specific section of the website related to their question.
    `;

    const model = genAI.getGenerativeModel({ 
      model: GEMINI_MODEL,
      systemInstruction: systemInstruction
    });

    // Format history for SDK (must alternate user/model)
    const history = [];
    messages.slice(0, -1).forEach((m) => {
      const role = m.role === 'assistant' || m.role === 'model' ? 'model' : 'user';
      if (history.length > 0 && history[history.length - 1].role === role) {
        history[history.length - 1].parts[0].text += '\n' + m.content;
      } else {
        history.push({ role, parts: [{ text: m.content }] });
      }
    });

    // SDK requirement: if first message is model, we should remove it or prepend a dummy user
    if (history.length > 0 && history[0].role === 'model') {
      history.shift();
    }

    const chatSession = model.startChat({
      history: history,
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.2,
      },
    });

    const result = await chatSession.sendMessage(lastUserMessage);
    const response = await result.response;
    const finalTextRaw = response.text();

    let finalText = finalTextRaw;
    let navigatePath = null;
    const navMatch = finalText.match(/\[NAVIGATE:\s*([^\]]+)\]/);
    if (navMatch) {
      navigatePath = navMatch[1].trim();
      finalText = finalText.replace(/\[NAVIGATE:\s*[^\]]+\]/, '').trim();
    }

    // Save to MongoDB
    if (conversationId) {
      try {
        await new ChatMessage({ conversationId, role: 'user', content: lastUserMessage }).save();
        await new ChatMessage({ conversationId, role: 'assistant', content: finalText }).save();
      } catch (dbErr) {
        console.warn('Failed to save messages to DB:', dbErr);
      }
    }

    return res.json({ message: finalText, navigate: navigatePath });

  } catch (error) {
    console.error('Chat assistant SDK error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'AI error occurred' });
  }
});
;

// DEV ONLY — preview how server will format contents for Gemini
// Add this block to server/routes/chat.js (then deploy/restart server)
router.post('/assistant/preview-contents', async (req, res) => {
  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages must be an array' });

    const normalizeRole = (role) => {
      if (!role) return 'user';
      const r = String(role).toLowerCase();
      if (r === 'user') return 'user';
      if (r === 'assistant' || r === 'system' || r === 'model') return 'model';
      return 'model';
    };

    const contents = messages.map((m) => ({
      role: normalizeRole(m.role),
      parts: [{ text: String(m.content ?? '') }],
    }));

    // Prepend assistant identity/instruction
    contents.unshift({
      role: 'model',
      parts: [{ text: 'You are Akalya Assistant, a helpful AI tutor. Be friendly and concise.' }],
    });

    // For debugging only — remove or restrict later
    return res.json({ ok: true, contents });
  } catch (err) {
    console.error('preview-contents error:', err);
    return res.status(500).json({ error: String(err) });
  }
});



/* -------------------------
   Export router
   ------------------------- */
export default router;
