import mongoose from "mongoose";

let cached = global._mongoose;
if (!cached) cached = global._mongoose = { conn: null, promise: null };

export default async function connectDB() {
    if (cached.conn) return cached.conn;
    if (!cached.promise) {
        const uri = `mongodb+srv://wilmerjrsantiago_db_user:${process.env.MONGO_PASS}@gamelogic.pl9ssdp.mongodb.net/pokerdb?retryWrites=true&w=majority&appName=GameLogic`;
        if (!uri) throw new Error("Falta MONGODB_URI");
        cached.promise = mongoose.connect(uri, {
            // opciones opcionales
            maxPoolSize: 10,
        }).then((m) => m.connection);
    }
    cached.conn = await cached.promise;
    return cached.conn;
}
