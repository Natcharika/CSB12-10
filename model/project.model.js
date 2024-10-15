const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    projectName: String,
    projectType: Number,
    projectStatus: Number,
    projectDescription: String,
    student: [{
        studentId: String,
        FirstName: String,
        LastName: String,
    }],
    lecturer: [{
        T_id: String,
        T_name: String,
    }],
    status: {
        CSB01: {
            date: { type: Date, default: Date.now },
            status: {type: String, enum: ["waiting", "failed","approved", "passed"], default: "waiting"},
            activeStatus: { type: Number, enum: [0, 3], default: 0 }, 
        },
        CSB02: {
            activeStatus: { type: Number, enum: [0, 1, 2, 3], default: 0 }, 
            status: {type: String, enum: ["waiting", "failed","approved","passed"], default: "waiting"},
            date: { type: Date, default: Date.now }
        },
        CSB03: {
            activeStatus: { type: Number, enum: [0, 1, 2, 3], default: 0 },
            status: {type: String, enum: ["waiting", "failed","approved", "passed"], default: "waiting"},
            date: { type: Date, default: Date.now }
        },
        CSB04: {
            activeStatus: { type: Number, enum: [0, 1, 2, 3], default: 0 },
            status: {type: String, enum: ["waiting", "failed","approved", "passed"], default: "waiting"},
            date: { type: Date, default: Date.now }
        }
    },
});

module.exports = mongoose.model('Project', projectSchema);
