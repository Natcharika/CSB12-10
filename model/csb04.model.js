const mongoose = require('mongoose');

const csb04Schema = new mongoose.Schema({
    projectId: String,
    confirmScore: { type: Number, min: 0, max: 100 },
    unconfirmScore : { type: Number, min: 0, max: 80 },
    logBookScore: { type: Number, min: 0, max: 10 },
    exhibitionScore: { type: Number, min: 0, max: 10 },
    csb03Status: {
        activeStatus: { type: Number, enum: [0, 1, 2], default: 0 }, // 0: nothing, 1: student action, 2: lecturer action
        status: {type: String, enum: ["waiting", "failed", "passed"], default: "waiting"},
        date: { type: Date, default: Date.now }
    },
    referee: [{
        T_id: String,
        T_name: String,
        role: String,
        score: Number,
        status: String,
        comment: String
    }],
});

module.exports = mongoose.model('csb04', csb04Schema);