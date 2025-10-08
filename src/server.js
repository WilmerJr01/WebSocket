// server.js
import { createServer } from "node:http";
import express from "express";
import { Server } from "socket.io";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const server = createServer(app);

// Health
app.get("/", (_, res) => res.send("Poker WS OK"));

// CORS: usa CORS_ORIGIN en prod, localhost en dev
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
    transports: ["websocket", "polling"],
    // (opcional) tunear latidos en redes móviles:
    // pingInterval: Number(process.env.PING_INTERVAL) || 25000,
    // pingTimeout: Number(process.env.PING_TIMEOUT) || 20000,
});

// ====== Estado mínimo ======
const userIdToSocket = new Map();

// ====== Auth del handshake ======
io.use((socket, next) => {
    try {
        // Front: io(url, { auth: { userId } })
        const { userId } = socket.handshake.auth || {};
        if (userId && String(userId).trim()) {
            socket.data.userId = String(userId).trim();
        } else {
            // Puedes permitir anónimo mientras pruebas, o lanzar error
            // return next(new Error("missing userId"));
            socket.data.userId = null;
        }
        next();
    } catch (e) {
        next(e);
    }
});

// ====== Conexión ======
io.on("connection", (socket) => {
    console.log("✅ conectado:", socket.id, "userId:", socket.data.userId);

    // --- Compat: si tu front también hace 'register' tras conectar ---
    socket.on("register", (userIdRaw) => {
        const userId = String(userIdRaw || "").trim();
        if (!userId) {
            socket.emit("register:error", "userId inválido");
            return;
        }
        const prev = userIdToSocket.get(userId);
        if (prev && prev !== socket.id) {
            io.sockets.sockets.get(prev)?.emit("session:replaced");
            io.sockets.sockets.get(prev)?.disconnect(true);
        }
        userIdToSocket.set(userId, socket.id);
        socket.data.userId = userId;
        socket.emit("register:ok", { userId });
    });

    // ====== NUEVO: eventos que usa tu front con ACK ======

    // joinTable(tableId, ack)
    socket.on("joinTable", (tableId, ack) => {
        try {
            const roomId = String(tableId || "").trim();
            if (!roomId) {
                ack?.({ ok: false, error: "tableId vacío" });
                socket.emit("joinTable:error", "tableId vacío");
                return;
            }

            // (Opcional) validar auth
            // if (!socket.data.userId) { ... }

            socket.join(roomId);
            // notifica a los demás en la mesa
            socket.to(roomId).emit("room:joined", { userId: socket.data.userId, roomId });
            ack?.({ ok: true });
        } catch (e) {
            const msg = e?.message || String(e);
            ack?.({ ok: false, error: msg });
            socket.emit("joinTable:error", msg);
        }
    });

    // leaveTable(tableId, ack)
    socket.on("leaveTable", (tableId, ack) => {
        try {
            const roomId = String(tableId || "").trim();
            if (!roomId) {
                ack?.({ ok: false, error: "tableId vacío" });
                return;
            }
            socket.leave(roomId);
            socket.to(roomId).emit("room:left", { userId: socket.data.userId, roomId });
            ack?.({ ok: true });
        } catch (e) {
            ack?.({ ok: false, error: e?.message || String(e) });
        }
    });

    // ====== Compatibilidad con nombres antiguos ======
    socket.on("joinRoom", (roomId, ack) => {
        // redirige al nuevo handler
        socket.emit("deprecation", "Usa 'joinTable' en lugar de 'joinRoom'.");
        socket.emit("debug", { received: { roomId } });
        socket.emit("joinTable:alias");
        const rid = String(roomId || "");
        if (!rid) return ack?.({ ok: false, error: "roomId vacío" });
        socket.join(rid);
        socket.to(rid).emit("room:joined", { userId: socket.data.userId, roomId: rid });
        ack?.({ ok: true });
    });

    socket.on("leaveRoom", (roomId, ack) => {
        socket.emit("deprecation", "Usa 'leaveTable' en lugar de 'leaveRoom'.");
        const rid = String(roomId || "");
        if (!rid) return ack?.({ ok: false, error: "roomId vacío" });
        socket.leave(rid);
        socket.to(rid).emit("room:left", { userId: socket.data.userId, roomId: rid });
        ack?.({ ok: true });
    });

    // ====== Eventos de mesa ======
    socket.on("table:event", ({ roomId, payload }) => {
        const rid = String(roomId || "").trim();
        if (!rid) return;
        // Aquí podrías validar reglas / estado / permisos
        io.to(rid).emit("table:update", payload);
    });

    // ====== Desconexión ======
    socket.on("disconnect", () => {
        if (socket.data.userId) {
            userIdToSocket.delete(socket.data.userId);
        }
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`WS escuchando en :${PORT}`);
});
