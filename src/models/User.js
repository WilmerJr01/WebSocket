import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  birthDate: {
    type: Date,
    required: true, 
  },
  stack: {
    type: Number,
    min: 0,
    default: 10000,
  },
  wins:{
    type: Number, 
    min: 0,
    default: 0,
  },
  totalGames:{
    type: Number,
    min: 0,
    default: 0,
  },
  nickname: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
  },
  password: {
    type: String,
    required: true,
  },
}, { timestamps: true });

export default mongoose.model("User", userSchema);
