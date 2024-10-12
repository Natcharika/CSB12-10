const mongoose = require("mongoose");

const anoucemnetSchema = new mongoose.Schema({
    examName: String,
    examStartDate: Date,
    examEndDate: Date,
});

module.exports = mongoose.model("Anoucemnet", anoucemnetSchema);
