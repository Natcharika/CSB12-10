const mongoose = require('mongoose');

const csb01Schema = new mongoose.Schema({
    projectId: String,
    confirmScore: Number,
    unconfirmScore : Number,
    referee: [{
        T_id: String,
        T_name: String,
        role: String,
        score: Number,
        status: String,
        comment: String
    }],
});

module.exports = mongoose.model('csb01', csb01Schema);