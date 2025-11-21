import mongoose from "mongoose";
import Table from "../models/Table.js";
import { maybeStartGame } from "../../logic/autoDealer.js";
import User from "../models/User.js";
import { waitingForDecision } from "../../logic/desicionManager.js";

export const configureSocket = (io) => {
    // Mapas de sesión
    const userIdToSocket = new Map(); // userId -> socketId
    const socketToUserId = new Map(); // socketId -> userId

    // ---------- Helpers ----------
    const safeAck = (ack, payload) => {
        try { if (typeof ack === "function") ack(payload); } catch { }
    };

    const isValidObjectId = (id) => {
        try { return !!id && mongoose.Types.ObjectId.isValid(id); }
        catch { return false; }
    };

    const getUserId = (socket) => socket.data.userId || socketToUserId.get(socket.id) || null;

    const registerUserMaps = (socket, userId) => {
        const prevSocketId = userIdToSocket.get(userId);
        if (prevSocketId && prevSocketId !== socket.id) {
            const prevSocket = io.sockets.sockets.get(prevSocketId);
            prevSocket?.emit("session:replaced");
            prevSocket?.disconnect(true);
        }
        userIdToSocket.set(userId, socket.id);
        socketToUserId.set(socket.id, userId);
        User.findById(userId).then(user => {
            if (user && user.nickname) {
                socket.data.nickname = user.nickname;
                socket.data.chips = user.stack;
            }
        })
        socket.data.userId = userId;
    };

    const unregisterUserMaps = (socket) => {
        const userId = socketToUserId.get(socket.id);
        if (userId && userIdToSocket.get(userId) === socket.id) {
            userIdToSocket.delete(userId);
        }
        socketToUserId.delete(socket.id);
    };

    function userChipsInTable(userChips, maxBuyIn, minBuyIn) {
        if (userChips >= maxBuyIn) return maxBuyIn;
        if (userChips >= minBuyIn) return userChips;
        if (userChips < minBuyIn) return 0;
    }

    // Limpia al usuario de todas las mesas (DB + rooms) para este socket
    const leaveAllTablesForSocket = async (socket) => {
        const userId = getUserId(socket);
        if (!userId) return;

        // Rooms donde está el socket (excluye la room privada del socket)
        const rooms = [...socket.rooms].filter((r) => r !== socket.id);

        // Intentar abandonar rooms y limpiar DB
        await Promise.allSettled(
            rooms.map(async (tableId) => {
                try {
                    if (isValidObjectId(tableId)) {
                        await Table.findByIdAndUpdate(
                            tableId,
                            { $pull: { players: userId } },
                            { new: false }
                        );
                        io.to(tableId).emit("playerLeft", { userId, tableId });
                    }
                } catch (e) {
                    console.error(`[leaveAllTables] Error limpiando ${tableId} para ${userId}:`, e.message);
                } finally {
                    try { await socket.leave(tableId); } catch { }
                }
            })
        );
    };

    // === CHAT NUEVO: helper para construir y emitir mensajes ===
    const buildChatMessage = ({ tableId, userId, nickname, text, isSystem = false }) => ({
        _id: new mongoose.Types.ObjectId().toString(), // id del mensaje
        tableId: String(tableId),
        userId: userId ? String(userId) : null,
        nickname: nickname || (isSystem ? "Sistema" : "Jugador"),
        text,
        isSystem,
        createdAt: new Date().toISOString(),
    });

    /**
     * Envía un mensaje de chat a TODOS los jugadores de una mesa.
     * Se puede usar desde cualquier módulo del backend.
     */
    const sendChatMessage = ({ tableId, userId = null, nickname, text, isSystem = false }) => {
        const cleanText = String(text || "").trim();
        if (!cleanText) return null;

        const payload = buildChatMessage({
            tableId,
            userId,
            nickname,
            text: cleanText,
            isSystem,
        });

        io.to(String(tableId)).emit("chat:message", payload);
        return payload;
    };
    // === FIN CHAT NUEVO ===

    // ---------- Middleware de handshake ----------
    io.use((socket, next) => {
        const userId = socket.handshake.auth?.userId;
        if (userId && String(userId).trim()) {
            socket.data.userId = String(userId).trim();
            console.log(`🤝 Handshake OK userId=${socket.data.userId}`);
        }
        next();
    });

    // ---------- Conexión ----------
    io.on("connection", async (socket) => {
        console.log("✅ Socket conectado:", socket.id);

        // Si vino en handshake, registra
        if (socket.data.userId) {
            registerUserMaps(socket, socket.data.userId);
            socket.emit("register:ok", { userId: socket.data.userId, socketId: socket.id });
        }

        socket.emit("welcome", "Bienvenido al servidor de Poker 🎲");

        // Compatibilidad: registro manual
        socket.on("register", (rawUserId) => {
            const userId = String(rawUserId || "").trim();
            if (!userId) {
                socket.emit("register:error", "userId inválido");
                return;
            }
            registerUserMaps(socket, userId);
            socket.emit("register:ok", { userId, socketId: socket.id });
            console.log(`🪪 Registrado userId=${userId} en socket=${socket.id}`);
        });

        // === CHAT NUEVO: handler para mensajes enviados por jugadores ===
        /**
         * Cliente emite:
         * socket.emit("chat:send", { tableId, text, nickname }, (resp) => { ... })
         */
        socket.on("chat:send", async ({ tableId, text, nickname }, ack) => {
            try {
                const userId = getUserId(socket);
                if (!userId) {
                    const msg = "No autenticado";
                    socket.emit("chat:error", msg);
                    return safeAck(ack, { ok: false, error: msg });
                }

                if (!isValidObjectId(tableId)) {
                    const msg = "tableId inválido.";
                    socket.emit("chat:error", msg);
                    return safeAck(ack, { ok: false, error: msg });
                }

                const cleanText = String(text || "").trim();
                if (!cleanText) {
                    return safeAck(ack, { ok: false, error: "Mensaje vacío" });
                }
                if (cleanText.length > 300) {
                    return safeAck(ack, { ok: false, error: "Mensaje demasiado largo" });
                }

                // Verificar que el usuario pertenece a la mesa
                const exists = await Table.exists({ _id: tableId, players: userId });
                if (!exists) {
                    const msg = "No perteneces a esta mesa.";
                    socket.emit("chat:error", msg);
                    return safeAck(ack, { ok: false, error: msg });
                }

                const nick = String(nickname || socket.data.nickname || "Jugador").slice(0, 24);

                const messagePayload = sendChatMessage({
                    tableId,
                    userId,
                    nickname: nick,
                    text: cleanText,
                    isSystem: false,
                });

                return safeAck(ack, { ok: true, message: messagePayload });
            } catch (err) {
                console.error("[chat:send] Error:", err);
                const msg = "Error al enviar mensaje.";
                socket.emit("chat:error", msg);
                return safeAck(ack, { ok: false, error: msg });
            }
        });
        // === FIN CHAT NUEVO ===

        socket.on("action:send", (payload) => {
            const { jugador, action, amount, tableId } = payload;

            // Si hay alguien esperando la decisión de este jugador…
            const resolver = waitingForDecision.get(jugador);
            if (resolver) {
                resolver({ action, amount, tableId }); // resolvemos la Promise
                waitingForDecision.delete(jugador);
            }
        });

        // Unirse a una mesa
        socket.on("joinTable", async (tableId, ack) => {
            try {
                const userId = getUserId(socket);
                if (!userId) {
                    const msg = "Debes registrarte primero (emitir 'register' con userId).";
                    socket.emit("joinTable:error", msg);
                    return safeAck(ack, { ok: false, error: msg });
                }

                if (!isValidObjectId(tableId)) {
                    const msg = "tableId inválido.";
                    socket.emit("joinTable:error", msg);
                    return safeAck(ack, { ok: false, error: msg });
                }

                const table = await Table.findById(tableId).lean();

                if (!table) {
                    const msg = "La mesa no existe.";
                    socket.emit("joinTable:error", msg);
                    return safeAck(ack, { ok: false, error: msg });
                }

                const players = Array.isArray(table.players) ? table.players : [];
                const maxPlayers = table.maxPlayers ?? 9;

                // Ya está dentro
                if (players.includes(userId)) {
                    await socket.join(tableId);
                    io.to(tableId).emit("players:update", { tableId, players });
                    console.log(`↩️ ${userId} ya estaba en la mesa ${tableId} (join idempotente).`);
                    return safeAck(ack, { ok: true, players });
                }

                // Capacidad
                if (players.length >= maxPlayers) {
                    const msg = "La mesa está llena.";
                    socket.emit("joinTable:error", msg);
                    return safeAck(ack, { ok: false, error: msg, capacity: maxPlayers });
                }

                // Agregar en DB
                const updated = await Table.findByIdAndUpdate(
                    tableId,
                    { $addToSet: { players: userId }, $set: { [`currentHand.chips.${userId}`]: userChipsInTable(socket.data.chips, table.maxBuyIn, table.minBuyIn) } },
                    { new: true }
                ).lean();

                // (Raro, pero si falla el update, aborta)
                if (!updated) {
                    const msg = "No se pudo actualizar la mesa.";
                    socket.emit("joinTable:error", msg);
                    return safeAck(ack, { ok: false, error: msg });
                }

                const nickname = socket.data.nickname;

                // Unir al room y notificar
                await socket.join(tableId);
                io.to(tableId).emit("players:update", { tableId, players: updated.players });
                sendChatMessage({
                    tableId,
                    text: `El jugador ${nickname} se ha unido a la mesa.`,
                    isSystem: true,
                });
                console.log(`Usuario ${userId} se unió a la mesa ${tableId}.`);
                maybeStartGame(io, tableId, userIdToSocket, sendChatMessage).catch(console.error);
                return safeAck(ack, { ok: true, players: updated.players });
            } catch (err) {
                console.error("[joinTable] Error:", err);
                const msg = "Error al unirse a la mesa.";
                socket.emit("joinTable:error", msg);
                return safeAck(ack, { ok: false, error: msg });
            }
        });

        // Salir de la mesa
        socket.on("leaveTable", async (tableId, ack) => {
            try {
                const userIdStr = socket.data.userId || socketToUserId.get(socket.id);
                if (!userIdStr) return ack?.({ ok: false, error: "No autenticado" });
                if (!isValidObjectId(tableId)) return ack?.({ ok: false, error: "tableId inválido" });

                const userOid = new mongoose.Types.ObjectId(userIdStr);

                // salir de la room de sockets
                await socket.leave(tableId);

                // Leemos estado mínimo para saber si el que sale es BTN/SB/BB/currentTurn
                const before = await Table.findById(
                    tableId,
                    {
                        players: 1,
                        inGame: 1,
                        "currentHand.order": 1,
                        "currentHand.BTN": 1,
                        "currentHand.SB": 1,
                        "currentHand.BB": 1,
                        "currentHand.currentTurn": 1,
                    }
                ).lean();

                if (!before) return ack?.({ ok: false, error: "Mesa no existe" });

                const wasBTN = String(before?.currentHand?.BTN || "") === userIdStr;
                const wasSB = String(before?.currentHand?.SB || "") === userIdStr;
                const wasBB = String(before?.currentHand?.BB || "") === userIdStr;
                const wasTurn = String(before?.currentHand?.currentTurn || "") === userIdStr;

                // Construimos el update atómico
                const update = {
                    $pull: {
                        players: userOid,
                        "currentHand.order": userOid,
                    },
                    // Quita sus apuestas y cartas privadas
                    $unset: {
                        [`currentHand.bets.${userIdStr}`]: "",
                        [`currentHand.cards.${userIdStr}`]: "",
                    },
                    $set: {}
                };

                // Si ocupaba alguna posición clave, la dejamos nula (luego puedes recalcular)
                if (wasBTN) update.$set["currentHand.BTN"] = null;
                if (wasSB) update.$set["currentHand.SB"] = null;
                if (wasBB) update.$set["currentHand.BB"] = null;
                if (wasTurn) update.$set["currentHand.currentTurn"] = null;

                const after = await Table.findByIdAndUpdate(
                    tableId,
                    update,
                    { new: true, projection: { players: 1, inGame: 1, currentHand: 1 } }
                ).lean();

                // Notificar salida
                io.to(tableId).emit("playerLeft", { userId: userIdStr, tableId });
                io.to(tableId).emit("players:update", { tableId, players: after?.players || [] });

                // Si quedan <2 jugadores, apagamos inGame
                if (after && (after.players?.length ?? 0) < 2 && after.inGame) {
                    await Table.findByIdAndUpdate(tableId, { $set: { inGame: false } });
                    io.to(tableId).emit("table:inGame", { tableId, inGame: false });
                } else {
                    // Opcional: emite el estado de mano actualizado para que el cliente se refresque
                    io.to(tableId).emit("hand:state", { tableId, state: after.currentHand });
                }

                ack?.({ ok: true });
            } catch (err) {
                console.error("[leaveTable] error:", err);
                ack?.({ ok: false, error: err.message || "Error al salir de la mesa" });
            }
        });

        // Desconexión
        socket.on("disconnect", async (reason) => {
            const userId = getUserId(socket);
            console.log(`❌ Socket desconectado ${socket.id} (userId=${userId || "-"}) razón=${reason}`);
            try {
                await leaveAllTablesForSocket(socket);
            } finally {
                unregisterUserMaps(socket);
            }
        });
    });

    // IMPORTANTE: ahora retornamos también la función de chat
    return { userIdToSocket, sendChatMessage };
};
