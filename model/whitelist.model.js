const mongoose = require("mongoose");

const whitelistSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  role: { type: String, enum: ["admin", "teacher"] },
});

module.exports = mongoose.model("whitelist", whitelistSchema);
