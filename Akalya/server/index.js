// server/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import authRoutes from './routes/auth.js';
import courseRouter from './routes/courses.js';
import assignmentRoutes from './routes/assignments.js';
import classRoutes from './routes/classes.js';
import enrollmentRoutes from './routes/enrollments.js';
import submissionRoutes from './routes/submissions.js';
import noteRoutes from './routes/notes.js';
import chatRoutes from './routes/chat.js';
import userRoutes from './routes/users.js';
import queriesRouter from './routes/queries.js';
import scholarshipsRouter from './routes/scholarships.js';
import entranceExamsRouter from './routes/entranceExams.js';
import jobsRouter from './routes/jobs.js';
import preparationResourcesRouter from './routes/preparationResources.js';
import practiceRouter from './routes/practice.js';
import mockTestsRouter from './routes/mockTests.js';
import lockerRouter from './routes/locker.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

/* ---------------------------------------------------
   GLOBAL CORS HEADERS (ALWAYS APPLIED)
   --------------------------------------------------- */
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:5173',
  'https://vedalya-remote-classroom.vercel.app',
  'https://vedalya-remote-classroom-pzt2.onrender.com'
];

// Add origins from environment variable if present
if (process.env.ALLOWED_ORIGINS) {
  const dynamicOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
  allowedOrigins.push(...dynamicOrigins);
}

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  // Allow any localhost port in local development (e.g., Vite fallback ports)
  return /^https?:\/\/localhost:\d+$/.test(origin);
};

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

/* ---------------------------------------------------
   EXPRESS JSON BODY PARSER
   --------------------------------------------------- */
app.use(express.json());

/* ---------------------------------------------------
   SECONDARY CORS HANDLER (SAFE)
   --------------------------------------------------- */
app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS: Not allowed"));
    },
    credentials: true
  })
);

/* ---------------------------------------------------
   ERROR PROTECTION WRAPPER (AVOID CRASH → 502)
   --------------------------------------------------- */
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

/* ---------------------------------------------------
   MONGODB CONNECTION
   --------------------------------------------------- */
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI. Check your `server/.env` file.");
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI)
  .then((conn) => {
    const dbName = conn?.connection?.db?.databaseName;
    console.log("Connected to MongoDB:", { dbName, mongoUri: MONGODB_URI });

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  });

/* ---------------------------------------------------
   ROUTES
   --------------------------------------------------- */
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRouter);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/queries', queriesRouter);
app.use('/api/scholarships', scholarshipsRouter);
app.use('/api/entrance-exams', entranceExamsRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/preparation-resources', preparationResourcesRouter);
app.use('/api/practice', practiceRouter);
app.use('/api/mock-tests', mockTestsRouter);
app.use('/api/locker', lockerRouter);

/* ---------------------------------------------------
   HEALTH CHECK
   --------------------------------------------------- */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Fallback error handler (prevents the server from returning HTML stack traces)
app.use((err, req, res, next) => {
  console.error("Express error:", err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: err?.message || "Server error" });
});

// Start server moved into successful MongoDB connection handler.
