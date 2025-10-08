import mongoose from "mongoose";

const gameSchema = new mongoose.Schema(
    {
        table: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Table",
            required: true,
        },
        players: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    required: true,
                },
                chips: { type: Number, required: true, min: 0},
                waitingTime: { type: Number, default: 30},
                cards: [{ type: String }],
            },
        ],
        inGamePlayers: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        winner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        pot: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        communityCards: [
            {
                type: String,
                trim: true,
            },
        ],
        status: {
            type: String,
            enum: ["waiting", "in_progress", "finished"],
            default: "waiting",
        },
        currentTurn: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        currentBet: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Game", gameSchema);
