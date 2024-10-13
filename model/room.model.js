const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    roomExam: String,
    dateExam: Date,
    nameExam: String,
    projects: [{
        projectId: String,
        projectName: String,
        start_in_time: String,
    }],
    referees: [{
        T_id: String,
        T_name: String,
        role: String,
    }],

});

module.exports = mongoose.model('Room', roomSchema);