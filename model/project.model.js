const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    projectName: String,
    projectType: Number,
    projectStatus: Number,
    projectDescription: String,
    student:[{
        studentId: String,
        FirstName: String,
        LastName: String,
    }],
    lecturer:[{
        lecturerId: String,
        FirstName: String,
        LastName: String,
    }],
    scoreId: String,
});

module.exports = mongoose.model('Project', projectSchema);