import { createServer } from "node:http";
import express from "express";
import { Server } from "socket.io";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = createServer(app);

// IMPORTANTE: CORS debe permitir tu front
const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",").map(s => s.trim()).filter(Boolean);
const io = new Server(server, {
    cors: {
        origin: allowedOrigins.length ? allowedOrigins : ["http://localhost:5173"],
        methods: ["GET", "POST"],
        credentials: true,
    },
    transports: ["websocket", "polling"], // fallback útil en móviles/redes raras
});

// --- lógica mínima de poker ---
const userIdToSocket = new Map();

io.on("connection", (socket) => {
    console.log("✅ conectado:", socket.id);

    socket.on("register", (userIdRaw) => {
        const userId = String(userIdRaw || "").trim();
        if (!userId) return socket.emit("register:error", "userId inválido");
        const prev = userIdToSocket.get(userId);
        if (prev && prev !== socket.id) {
            io.sockets.sockets.get(prev)?.emit("session:replaced");
            io.sockets.sockets.get(prev)?.disconnect(true);
        }
        userIdToSocket.set(userId, socket.id);
        socket.data.userId = userId;
        socket.emit("register:ok", { userId });
    });

    socket.on("joinRoom", (roomId) => {
        roomId = String(roomId || "");
        socket.join(roomId);
        io.to(roomId).emit("room:joined", { userId: socket.data.userId, roomId });
    });

    socket.on("leaveRoom", (roomId) => {
        roomId = String(roomId || "");
        socket.leave(roomId);
        io.to(roomId).emit("room:left", { userId: socket.data.userId, roomId });
    });

    socket.on("table:event", ({ roomId, payload }) => {
        io.to(String(roomId || "")).emit("table:update", payload);
    });

    socket.on("disconnect", () => {
        if (socket.data.userId) userIdToSocket.delete(socket.data.userId);
    });
});

// Railway inyecta PORT. ¡No hardcodees 3001 en producción!
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`WS escuchando en :${PORT}`));

// Endpoint simple para health
app.get("/", (_, res) => res.send("Poker WS OK"));
