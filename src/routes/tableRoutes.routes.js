import { Router } from "express";
import { createTable, getTables, getTableById, updateTable, deleteTable } from "../controllers/table.controller.js";

const tableRoutes = Router();

tableRoutes.post("/", createTable);        // Crear mesa
tableRoutes.get("/", getTables);           // Obtener todas las mesas
tableRoutes.get("/:id", getTableById);     // Obtener mesa por ID
tableRoutes.put("/:id", updateTable);      // Actualizar mesa
tableRoutes.delete("/:id", deleteTable);   // Eliminar mesa

export default tableRoutes;
