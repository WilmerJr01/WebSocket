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
    gamesPlayed: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Game'
    }]
}, { timestamps: true });

export default mongoose.model("Table", tableSchema);