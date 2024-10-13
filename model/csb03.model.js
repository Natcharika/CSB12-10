const mongoose = require('mongoose');

const csb03Schema = new mongoose.Schema({
    projectId: String,
    status: String,
});

module.exports = mongoose.model('csb03', csb03Schema);