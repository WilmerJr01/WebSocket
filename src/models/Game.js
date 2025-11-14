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
                cards: [{ type: String }],
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
        }
    },
    { timestamps: true }
);

export default mongoose.model("Game", gameSchema);
