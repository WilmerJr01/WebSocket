import { Router } from "express";
import {
    createGame,
    getGames,
    getGameById,
    updateGame,
    deleteGame,
} from "../controllers/game.controller.js";

const gameRoutes = Router();

gameRoutes.post("/", createGame); // Crear juego
gameRoutes.get("/", getGames); // Obtener todos los juegos
gameRoutes.get("/:id", getGameById); // Obtener juego por ID
gameRoutes.put("/:id", updateGame); // Actualizar juego
gameRoutes.delete("/:id", deleteGame); // Eliminar juego

export default gameRoutes;
