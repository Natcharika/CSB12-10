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
            status: {type: String, enum: ["รอดำเนินการ", "ไม่ผ่าน", "ผ่าน"], default: "รอดำเนินการ"},
            score: { type: Number, default: 0 },
            activeStatus: { type: Number, enum: [0, 1, 2], default: 0 }, 
        },
        CSB02: {
            activeStatus: { type: Number, enum: [0, 1, 2, 3], default: 0 }, 
            status: {type: String, enum: ["รอดำเนินการ", "ไม่ผ่าน","ผ่านการอนุมัติจากอาจารย์","ผ่าน"], default: "รอดำเนินการ"},
            score: { type: Number, default: 0 },

            date: { type: Date, default: Date.now }
        },
        CSB03: {
            activeStatus: { type: Number, enum: [0, 1, 2, 3], default: 0 },
            status: {type: String, enum: ["รอดำเนินการ", "ไม่ผ่าน","ผ่านการอนุมัติจากอาจารย์","ผ่าน"], default: "รอดำเนินการ"},
            date: { type: Date, default: Date.now }
        },
        CSB04: {
            activeStatus: { type: Number, enum: [0, 1, 2, 3], default: 0 },
            status: {type: String, enum:  ["รอดำเนินการ", "ไม่ผ่าน","ผ่านการอนุมัติจากอาจารย์","ผ่าน"], default: "รอดำเนินการ"},
            score: { type: Number, default: 0 },
            date: { type: Date, default: Date.now }
        }
    },
});

module.exports = mongoose.model('Project', projectSchema);
