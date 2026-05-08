import mongoose from "mongoose";
import dotenv from "dotenv";
import MockTest from "./models/MockTest.js";
import MockTestQuestion from "./models/MockTestQuestion.js";

dotenv.config();

const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/akalya";

async function seed() {
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to DB");

    const test = new MockTest({
      title: "JEE Main Full Length Mock Test 1",
      examName: "JEE Main",
      type: "full_length",
      durationMinutes: 60,
      totalMarks: 10,
      isActive: true,
    });
    await test.save();
    console.log("Mock Test Created:", test._id);

    const questions = [
      {
        mockTestId: test._id,
        question: "What is the unit of force?",
        options: ["Joule", "Newton", "Watt", "Pascal"],
        correctIndex: 1,
        marks: 2,
        subject: "Physics",
        order: 1,
      },
      {
        mockTestId: test._id,
        question: "What is the chemical formula of water?",
        options: ["H2O2", "HO", "H2O", "OH-"],
        correctIndex: 2,
        marks: 2,
        subject: "Chemistry",
        order: 2,
      },
      {
        mockTestId: test._id,
        question: "Find the derivative of x^2.",
        options: ["x", "2x", "x^3/3", "1"],
        correctIndex: 1,
        marks: 2,
        subject: "Mathematics",
        order: 3,
      },
      {
        mockTestId: test._id,
        question: "Which of the following is a noble gas?",
        options: ["Oxygen", "Nitrogen", "Argon", "Fluorine"],
        correctIndex: 2,
        marks: 2,
        subject: "Chemistry",
        order: 4,
      },
      {
        mockTestId: test._id,
        question: "What is the SI unit of electric current?",
        options: ["Volt", "Ohm", "Ampere", "Coulomb"],
        correctIndex: 2,
        marks: 2,
        subject: "Physics",
        order: 5,
      }
    ];

    await MockTestQuestion.insertMany(questions);
    console.log("Questions Inserted");

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
