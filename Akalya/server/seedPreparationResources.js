import mongoose from "mongoose";
import dotenv from "dotenv";
import PreparationResource from "./models/PreparationResource.js";

dotenv.config();

const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/akalya";

async function seed() {
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to DB");

    // Clear existing data (optional, but good for fresh seed)
    await PreparationResource.deleteMany({});
    console.log("Cleared existing PreparationResources");

    const resources = [
      // Books
      {
        title: "Concepts of Physics by H.C. Verma",
        type: "book",
        description: "A comprehensive book for JEE and NEET physics preparation, covering theoretical concepts with practical problems.",
        url: "https://www.amazon.in/Concepts-Physics-1-H-C-Verma/dp/8177091875",
        classLevel: "11-12",
        subject: "Physics",
        isActive: true,
      },
      {
        title: "Objective Biology for NEET by Trueman",
        type: "book",
        description: "Excellent resource for deep diving into biology topics with an extensive collection of MCQs.",
        url: "https://www.amazon.in/Truemans-Objective-Biology-NEET-Vol/dp/B08V8R5Q74",
        classLevel: "11-12",
        subject: "Biology",
        isActive: true,
      },
      {
        title: "Mathematics for Class 10 by R.D. Sharma",
        type: "book",
        description: "Highly recommended for building a strong foundation in Mathematics for board exams and future competitive tests.",
        url: "https://www.amazon.in/Mathematics-Class-10-R-D-Sharma/dp/938318244X",
        classLevel: "10",
        subject: "Mathematics",
        isActive: true,
      },

      // YouTube Channels
      {
        title: "Physics Wallah - Alakh Pandey",
        type: "youtube",
        description: "Free and high-quality lectures for JEE, NEET, and board exam preparation in Hindi and English.",
        url: "https://www.youtube.com/c/PhysicsWallah",
        classLevel: "9-12",
        subject: "All Subjects",
        isActive: true,
      },
      {
        title: "Unacademy JEE",
        type: "youtube",
        description: "Live classes, tips, and strategies for cracking the JEE Main and Advanced examinations.",
        url: "https://www.youtube.com/c/UnacademyJEE",
        classLevel: "11-12",
        subject: "PCM",
        isActive: true,
      },

      // Govt Resources
      {
        title: "NCERT Official E-Books",
        type: "govt",
        description: "Download official NCERT textbooks for all subjects and classes completely free of cost.",
        url: "https://ncert.nic.in/textbook.php",
        classLevel: "6-12",
        subject: "All Subjects",
        isActive: true,
      },
      {
        title: "National Digital Library of India (NDLI)",
        type: "govt",
        description: "A virtual repository of learning resources with a single-window search facility.",
        url: "https://ndl.iitkgp.ac.in/",
        classLevel: "All",
        subject: "All Subjects",
        isActive: true,
      },
      {
        title: "DIKSHA Portal",
        type: "govt",
        description: "National Digital Infrastructure for Teachers and Students offering interactive learning content.",
        url: "https://diksha.gov.in/",
        classLevel: "1-12",
        subject: "All Subjects",
        isActive: true,
      },

      // Previous Years Papers
      {
        title: "JEE Main Previous Year Question Papers",
        type: "previous_paper",
        description: "Official JEE Main past papers with answer keys for thorough practice and pattern understanding.",
        url: "https://jeemain.nta.nic.in/past-papers/",
        classLevel: "12",
        subject: "PCM",
        isActive: true,
      },
      {
        title: "NEET Previous Year Papers",
        type: "previous_paper",
        description: "Collection of NEET UG question papers from the past 10 years.",
        url: "https://neet.nta.nic.in/previous-year-question-papers/",
        classLevel: "12",
        subject: "PCB",
        isActive: true,
      },

      // Timetables and Roadmaps
      {
        title: "1-Year Study Plan for JEE Main",
        type: "roadmap",
        description: "A detailed month-by-month roadmap focusing on syllabus coverage, revision strategies, and mock test schedules.",
        url: "https://example.com/jee-roadmap-1year",
        classLevel: "12",
        subject: "PCM",
        isActive: true,
      },
      {
        title: "Class 10 Board Exam Timetable Strategy",
        type: "timetable",
        description: "A strategic daily timetable ensuring balanced preparation for all major subjects 3 months before boards.",
        url: "https://example.com/class-10-timetable",
        classLevel: "10",
        subject: "All Subjects",
        isActive: true,
      },

      // Strategy Tips
      {
        title: "How to attempt MCQs effectively?",
        type: "strategy",
        description: "Techniques like elimination, educated guessing, and time management for multiple-choice questions.",
        url: "https://example.com/mcq-strategy",
        classLevel: "All",
        subject: "General",
        isActive: true,
      },
      {
        title: "Overcoming Exam Anxiety",
        type: "strategy",
        description: "Psychological tips, breathing exercises, and preparation habits to stay calm during high-pressure exams.",
        url: "https://example.com/exam-anxiety-tips",
        classLevel: "All",
        subject: "General",
        isActive: true,
      }
    ];

    await PreparationResource.insertMany(resources);
    console.log("Preparation Resources Inserted");

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
