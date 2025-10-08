import Game from "../models/Game.js";

// Crear juego
export const createGame = async (req, res) => {
    try {
        const {
            table,
            players,
            pot,
            communityCards,
            status,
            currentTurn,
            currentBet,
        } = req.body;

        const game = new Game({
            table,
            players,
            pot,
            communityCards,
            status,
            currentTurn,
            currentBet,
        });

        await game.save();
        res.status(201).json(game);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Obtener todos los juegos
export const getGames = async (req, res) => {
    try {
        const games = await Game.find()
            .populate("table")
            .populate("players.user")
            .populate("inGamePlayers")
            .populate("winner")
            .populate("currentTurn");

        res.json(games);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener juego por ID
export const getGameById = async (req, res) => {
    try {
        const game = await Game.findById(req.params.id)
            .populate("table")
            .populate("players.user")
            .populate("inGamePlayers")
            .populate("winner")
            .populate("currentTurn");

        if (!game)
            return res.status(404).json({ message: "Juego no encontrado" });
        res.json(game);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Actualizar juego
export const updateGame = async (req, res) => {
    try {
        const game = await Game.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        });
        if (!game)
            return res.status(404).json({ message: "Juego no encontrado" });
        res.json(game);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Eliminar juego
export const deleteGame = async (req, res) => {
    try {
        const game = await Game.findByIdAndDelete(req.params.id);
        if (!game)
            return res.status(404).json({ message: "Juego no encontrado" });
        res.json({ message: "Juego eliminado con éxito" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
