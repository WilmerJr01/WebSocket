// server.js
import { createServer } from "node:http";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";

import connectDB from "./config/db.js";
import router from "./routes/index.routes.js";              // tus rutas /api (opcional)
import { configureSocket } from "./controllers/socket.controller.js";

dotenv.config();

const app = express();

// --- CORS HTTP (para tus rutas REST, si las usas) ---
const httpOrigins = (process.env.CORS_ORIGIN || "")
    .split(",").map(s => s.trim()).filter(Boolean);
app.use(cors({
    origin: httpOrigins.length ? httpOrigins : ["http://localhost:5173"],
    credentials: true,
}));
app.use(express.json());

// --- Health HTTP ---
app.get("/", (_, res) => res.send("Poker API + WS OK"));
app.get("/api/health", (_, res) => res.json({ ok: true }));

// --- Conexión a Mongo ---
await connectDB();

// --- Rutas HTTP (opcional; si tienes /api/*) ---
app.use("/api", router);

// --- HTTP server + Socket.IO ---
const server = createServer(app);

const wsOrigins = (process.env.CORS_ORIGIN || "")
    .split(",").map(s => s.trim()).filter(Boolean);

const io = new Server(server, {
    cors: {
        origin: wsOrigins.length ? wsOrigins : ["http://localhost:5173"],
        methods: ["GET", "POST"],
        credentials: true,
    },
    transports: ["websocket", "polling"], // permite fallback para el upgrade
    // pingInterval: Number(process.env.PING_INTERVAL) || 25000,
    // pingTimeout: Number(process.env.PING_TIMEOUT) || 20000,
});

// --- Tu lógica de sockets (tal cual) ---
const maps = configureSocket(io); // { userIdToSocket } si lo usas

// --- Arranque ---
const PORT = process.env.PORT || 3000; // Railway inyecta PORT
server.listen(PORT, () => {
    console.log(`🚀 Backend (HTTP + WS) escuchando en :${PORT}`);
});
