import mongoose from "mongoose";

const tableSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    players: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    maxPlayers: {
        type: Number,
        required: true,
        min: 0,
        max: 9,
    },
    minBuyIn: {
        type: Number,
        required: true,
        min: 0,
    },
    maxBuyIn: {
        type: Number,
        required: true,
        min: 0,
    },
    bigBlind: {
        type: Number,
        required: true,
        min: 0,
        default: 200,
    },
    smallBlind: {
        type: Number,
        required: true,
        min: 0,
        default: 100,
    },
    inGame: {
        type: Boolean,
        default: false,
    },
    currentHand: {
        order: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],          // orden de jugadores en esta mano
        BTN: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },              // posición del botón
        SB: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },               // small blind
        BB: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },               // big blind
        pot: Number,              // pozo total acumulado
        currentTurn: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },        // índice del jugador actual
        bets: { type: Map, of: Number },  // apuestas actuales por jugador
        cards: { type: Map, of: [String] }, // cartas ocultas por jugador
        community: [String]
    }
}, { timestamps: true });

export default mongoose.model("Table", tableSchema);