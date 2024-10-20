const mongoose = require('mongoose');

const csb01Schema = new mongoose.Schema({
    projectId: String,
    confirmScore:{ type: Number, min: 0, max: 100 },
    unconfirmScore :  { type: Number, min: 0, max: 99 },
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