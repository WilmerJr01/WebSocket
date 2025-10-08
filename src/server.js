import { createServer } from "node:http";
import express from "express";
import { Server } from "socket.io";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import Table from "./models/Table.js";

dotenv.config();

const app = express();
const server = createServer(app);

// Health check
app.get("/", (_, res) => res.send("Poker WS OK"));

// ===== CORS =====
const allowedOrigins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

const io = new Server(server, {
    cors: {
        origin: allowedOrigins.length ? allowedOrigins : ["http://localhost:5173"],
        methods: ["GET", "POST"],
        credentials: true,
    },
    transports: ["websocket", "polling"], // deja polling como fallback
    // pingInterval: Number(process.env.PING_INTERVAL) || 25000,
    // pingTimeout: Number(process.env.PING_TIMEOUT) || 20000,
});

// ===== Conexión a BD (singleton, serverless-friendly también) =====
await connectDB();

// ===== Estado en memoria =====
const userIdToSocket = new Map();
const socketToUserId = new Map();

// ===== Auth en handshake (compat con tu front: auth.userId) =====
io.use((socket, next) => {
    const userId = socket.handshake.auth?.userId;
    if (userId && String(userId).trim()) {
        socket.data.userId = String(userId).trim();
        // no forzamos error si no viene; puedes exigirlo si quieres
    }
    return next();
});

// ===== Conexiones =====
io.on("connect", (socket) => {
    console.log("✅ Socket conectado:", socket.id, "userId:", socket.data.userId);

    // Compat: registro manual si el cliente también emite 'register'
    socket.on("register", (rawUserId) => {
        const userId = String(rawUserId || "").trim();
        if (!userId) {
            socket.emit("register:error", "userId inválido");
            return;
        }

        const prevSocketId = userIdToSocket.get(userId);
        if (prevSocketId && prevSocketId !== socket.id) {
            const prevSocket = io.sockets.sockets.get(prevSocketId);
            prevSocket?.emit("session:replaced");
            prevSocket?.disconnect(true);
        }

        userIdToSocket.set(userId, socket.id);
        socketToUserId.set(socket.id, userId);
        socket.data.userId = userId;

        socket.emit("register:ok", { userId, socketId: socket.id });
        console.log(`🪪 Registrado userId=${userId} en socket=${socket.id}`);
    });

    // === joinTable con ACK y persistencia en Mongo ===
    socket.on("joinTable", async (tableId, ack) => {
        try {
            const userId = socket.data.userId || socketToUserId.get(socket.id);
            if (!userId) {
                const msg = "Debes registrarte primero (handshake o 'register').";
                socket.emit("joinTable:error", msg);
                return ack?.({ ok: false, error: msg });
            }

            if (!tableId) {
                const msg = "Falta tableId.";
                socket.emit("joinTable:error", msg);
                return ack?.({ ok: false, error: msg });
            }

            const table = await Table.findById(tableId);
            if (!table) {
                const msg = "La mesa no existe.";
                socket.emit("joinTable:error", msg);
                return ack?.({ ok: false, error: msg });
            }

            await socket.join(tableId);

            const updated = await Table.findByIdAndUpdate(
                tableId,
                { $addToSet: { players: userId } },
                { new: true }
            );

            io.to(tableId).emit("players:update", {
                tableId,
                players: updated.players,
            });

            ack?.({ ok: true, players: updated.players });
            console.log(`👤 ${userId} se unió a la mesa ${tableId}`);
        } catch (err) {
            console.error(err);
            const msg = "Error al unirse a la mesa.";
            socket.emit("joinTable:error", msg);
            ack?.({ ok: false, error: msg });
        }
    });

    // === leaveTable con ACK y notificación ===
    socket.on("leaveTable", async (tableId, ack) => {
        try {
            const userId = socket.data.userId || socketToUserId.get(socket.id);
            if (tableId) await socket.leave(tableId);
            io.to(tableId).emit("playerLeft", { userId, tableId });
            ack?.({ ok: true });
        } catch (err) {
            ack?.({ ok: false, error: err.message });
        }
    });

    // Eventos de estado en tiempo real (ejemplo)
    socket.on("table:event", ({ roomId, payload }) => {
        const rid = String(roomId || "").trim();
        if (!rid) return;
        io.to(rid).emit("table:update", payload);
    });

    socket.emit("welcome", "Bienvenido al servidor de Poker 🎲");

    socket.on("disconnect", () => {
        const userId = socketToUserId.get(socket.id);
        if (userId && userIdToSocket.get(userId) === socket.id) {
            userIdToSocket.delete(userId);
        }
        socketToUserId.delete(socket.id);
        console.log("❌ Socket desconectado:", socket.id);
    });
});

const PORT = process.env.PORT || 3001; // Railway inyecta PORT automáticamente
server.listen(PORT, () => {
    console.log(`WS escuchando en :${PORT}`);
});
