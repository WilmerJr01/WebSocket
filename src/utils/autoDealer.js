import mongoose from "mongoose";
import Table from "../models/Table.js";

// Arranque real de mano (tu función ya preparada)
async function startHand(io, tableId, userIdToSocket) {
    // rota botón, blinds, set gamesPlayed, currentHand.inProgress=true,
    // repartir hole cards (emit privado), emits públicos, etc.
    return true;
}

// Intenta marcar inGame y arrancar (atomizado)
export async function maybeStartGame(io, tableId, userIdToSocket) {
    const doc = await Table.findOneAndUpdate(
        {
            _id: tableId,
            inGame: { $ne: true },                  // aún no en partida
            $expr: { $gte: [{ $size: "$players" }, 2] }  // hay 2+ sentados
        },
        { $set: { inGame: true } },
        { new: true }
    ).lean();

    if (doc) {
        // Este proceso ganó la carrera → inicia mano
        await startHand(io, tableId, userIdToSocket);
    }
}