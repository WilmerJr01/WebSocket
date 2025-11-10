import Table from "../models/Table.js";

export const configureSocket = (io) => {
    // Mapas útiles
    const StartGame = false;
    const userIdToSocket = new Map();
    const socketToUserId = new Map();

    // 🟢 1) Añade ESTE BLOQUE antes del io.on("connect")
    io.use((socket, next) => {
        const userId = socket.handshake.auth?.userId; // viene desde el cliente (socket.auth)
        if (userId) {
            socket.data.userId = userId;
            console.log(`🤝 Autenticado por handshake userId=${userId}`);
        }
        next(); // continuar siempre
    });

    // 🟢 2) Ahora sí, manejamos las conexiones
    io.on("connect", (socket) => {
        console.log("✅ Socket conectado:", socket.id);

        // Registrar usuario manualmente (compatibilidad con clientes antiguos)
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

        // Unirse a una mesa
        socket.on("joinTable", async (tableId, ack) => {
            try {
                const userId = socket.data.userId || socketToUserId.get(socket.id);
                if (!userId) {
                    const msg = "Debes registrarte primero (emitir 'register' con userId).";
                    socket.emit("joinTable:error", msg);
                    if (typeof ack === "function") ack({ ok: false, error: msg });
                    return;
                }

                if (!tableId) {
                    const msg = "Falta tableId.";
                    socket.emit("joinTable:error", msg);
                    if (typeof ack === "function") ack({ ok: false, error: msg });
                    return;
                }

                const table = await Table.findById(tableId);
                if (!table) {
                    const msg = "La mesa no existe.";
                    socket.emit("joinTable:error", msg);
                    if (typeof ack === "function") ack({ ok: false, error: msg });
                    return;
                }

                await socket.join(tableId);

                const updatedTable = await Table.findByIdAndUpdate(
                    tableId,
                    { $addToSet: { players: userId } },
                    { new: true }
                );

                io.to(tableId).emit("players:update", {
                    tableId,
                    players: updatedTable.players,
                });

                if (typeof ack === "function") ack({ ok: true, players: updatedTable.players });
                console.log(`👤 ${userId} se unió a la mesa ${tableId}`);
            } catch (err) {
                console.error(err);
                const msg = "Error al unirse a la mesa.";
                socket.emit("joinTable:error", msg);
                if (typeof ack === "function") ack({ ok: false, error: msg });
            }
        });

        // Salir de la mesa
        socket.on("leaveTable", async (tableId, ack) => {
            try {
                const userId = socket.data.userId || socketToUserId.get(socket.id);
                await socket.leave(tableId);
                io.to(tableId).emit("playerLeft", { userId, tableId });
                if (typeof ack === "function") ack({ ok: true });
            } catch (err) {
                if (typeof ack === "function") ack({ ok: false, error: err.message });
            }
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

    return { userIdToSocket };
};
