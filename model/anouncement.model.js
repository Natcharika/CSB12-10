const mongoose = require("mongoose");

const anoucemnetSchema = new mongoose.Schema({
    examcsb01: { type: String, required: true },
    examcsb02: { type: String, required: true },
    examcsb03: { type: String, required: true },
    examcsb04: { type: String, required: true },
});

module.exports = mongoose.model("anouncement", anoucemnetSchema);
