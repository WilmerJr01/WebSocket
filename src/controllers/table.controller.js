import Table from "../models/Table.js";

// Crear mesa
export const createTable = async (req, res) => {
  try {
    const { name, maxPlayers, minBuyIn, maxBuyIn, bigBlind, smallBlind } = req.body;

    const table = new Table({
      name,
      maxPlayers,
      minBuyIn,
      maxBuyIn,
      bigBlind,
      smallBlind,
    });

    await table.save();
    res.status(201).json(table);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Obtener todas las mesas
export const getTables = async (req, res) => {
  try {
    const tables = await Table.find();
    res.json(tables);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener mesa por ID
export const getTableById = async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) return res.status(404).json({ message: "Mesa no encontrada" });
    res.json(table);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Actualizar mesa
export const updateTable = async (req, res) => {
  try {
    const table = await Table.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!table) return res.status(404).json({ message: "Mesa no encontrada" });
    res.json(table);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Eliminar mesa
export const deleteTable = async (req, res) => {
  try {
    const table = await Table.findByIdAndDelete(req.params.id);
    if (!table) return res.status(404).json({ message: "Mesa no encontrada" });
    res.json({ message: "Mesa eliminada con éxito" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
