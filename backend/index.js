import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import ImageKit from "imagekit";
import mongoose from "mongoose";

import Chat from "./models/chat.js";
import UserChats from "./models/userChats.js";

import { clerkMiddleware, getAuth } from "@clerk/express";

const port = process.env.PORT || 3000;
const app = express();

// =======================
// CORS (MUST BE FIRST)
// =======================
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "https://lama-ai-client1.vercel.app",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      // Allow if it is in whitelisted list or ends with .vercel.app (handles Vercel branch preview URLs)
      const isAllowed = allowedOrigins.includes(origin) || origin.endsWith(".vercel.app") || origin.includes(".vercel.app");

      if (isAllowed) {
        return callback(null, true);
      }

      console.log("Blocked by CORS:", origin);
      return callback(null, false); // Reject origin gracefully without throwing Express middleware error
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());

// DEBUG
console.log(
  "CLERK_SECRET_KEY:",
  process.env.CLERK_SECRET_KEY
    ? process.env.CLERK_SECRET_KEY.slice(0, 10) + "..."
    : "MISSING"
);

// IMPORTANT
app.use(clerkMiddleware());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//
// =======================
// BODY PARSER
// =======================
//

app.use(express.json());

//
// =======================
// MONGODB
// =======================
//

let isConnected = false;

const connect = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }
  try {
    console.log("MONGO =", process.env.MONGO ? "Defined" : "MISSING");
    if (!process.env.MONGO) {
      throw new Error("MONGO environment variable is not defined");
    }
    await mongoose.connect(process.env.MONGO);
    isConnected = true;
    console.log("Connected to MongoDB");
  } catch (err) {
    console.log("Mongo Error:", err);
    throw err;
  }
};

// Database connection middleware
app.use(async (req, res, next) => {
  // Skip DB connection for static files if any, but run for APIs
  if (req.path.startsWith("/api")) {
    try {
      await connect();
    } catch (err) {
      return res.status(500).send("Database connection error: " + err.message);
    }
  }
  next();
});

//
// =======================
// IMAGEKIT
// =======================
//

const imagekit = new ImageKit({
  urlEndpoint: process.env.IMAGE_KIT_ENDPOINT,
  publicKey: process.env.IMAGE_KIT_PUBLIC_KEY,
  privateKey: process.env.IMAGE_KIT_PRIVATE_KEY,
});

app.get("/api/upload", (req, res) => {
  const result = imagekit.getAuthenticationParameters();
  res.send(result);
});

//
// =======================
// CREATE CHAT
// =======================
//

app.post("/api/chats", async (req, res) => {
  try {
    const { userId } = getAuth(req);

    console.log("USER ID:", userId);
    console.log("BODY:", req.body);

    if (!userId) {
      return res.status(401).send("Unauthorized");
    }

    const { text, img } = req.body;

    const newChat = new Chat({
      userId,
      history: [
        {
          role: "user",
          parts: [{ text }],
          ...(img && { img }),
        },
      ],
    });

    const savedChat = await newChat.save();

    await UserChats.updateOne(
      { userId },
      {
        $push: {
          chats: {
            _id: savedChat._id,
            title: text.substring(0, 40),
          },
        },
      },
      { upsert: true }
    );

    res.status(201).send(savedChat._id);
  } catch (err) {
    console.log("CHAT ERROR:", err);
    res.status(500).send("Error creating chat: " + err.message);
  }
});

//
// =======================
// GET USER CHATS
// =======================
//

app.get("/api/userchats", async (req, res) => {
  try {
    const { userId } = getAuth(req);

    console.log("USER ID:", userId);

    if (!userId) {
      return res.status(401).send("Unauthorized");
    }

    const userChats = await UserChats.findOne({ userId });

    res.status(200).send(userChats?.chats || []);
  } catch (err) {
    console.log("USERCHATS ERROR:", err);
    res.status(500).send("Error fetching userchats: " + err.message);
  }
});

//
// =======================
// GET SINGLE CHAT
// =======================
//

app.get("/api/chats/:id", async (req, res) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).send("Unauthorized");
    }

    const chat = await Chat.findOne({
      _id: req.params.id,
      userId,
    });

    res.status(200).send(chat);
  } catch (err) {
    console.log("GET CHAT ERROR:", err);
    res.status(500).send("Error fetching chat: " + err.message);
  }
});

//
// =======================
// UPDATE CHAT
// =======================
//

app.put("/api/chats/:id", async (req, res) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).send("Unauthorized");
    }

    const { question, answer, img } = req.body;

    const newItems = [
      ...(question !== null && question !== undefined
        ? [
          {
            role: "user",
            parts: [{ text: question }],
            ...(img && { img }),
          },
        ]
        : []),
      {
        role: "model",
        parts: [{ text: answer }],
      },
    ];

    const updatedChat = await Chat.findOneAndUpdate(
      { _id: req.params.id, userId },
      {
        $push: {
          history: {
            $each: newItems,
          },
        },
      },
      { new: true }
    );

    res.status(200).send(updatedChat);
  } catch (err) {
    console.log("UPDATE CHAT ERROR:", err);
    res.status(500).send("Error adding conversation: " + err.message);
  }
});

//
// =======================
// ERROR HANDLER
// =======================
//

app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);
  res.status(401).send("Unauthenticated!");
});

//
// =======================
// FRONTEND BUILD
// =======================
//

app.use(express.static(path.join(__dirname, "../client/dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist", "index.html"));
});

//
// =======================
// START SERVER
// =======================
//

app.listen(port, () => {
  connect();
  console.log(`Server running on ${port}`);
});
// Nodemon reload trigger