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
        keyLecturer: String,
        nameLecturer: String,
        roleLecturer: String,
    }],

});

module.exports = mongoose.model('Room', roomSchema);