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
        }],
        orderPreFlop: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        pot: Number,              // pozo total acumulado
        currentTurn: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        chips:{ type: Map, of: Number },      
        bets: { type: Map, of: Number },  // apuestas actuales por jugador
        cards: { type: Map, of: [String] }, // cartas ocultas por jugador
        community: [String]
    }
}, { timestamps: true });

export default mongoose.model("Table", tableSchema);