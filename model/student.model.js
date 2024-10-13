const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
    S_id: String,
    S_name: String,
    S_firstname_en: String,
    S_lastname_en: String,
    S_email: String,
    S_account_type: String,
    S_status: {type: String, enum: ["unverify", "verify"], default: "unverify"},
},
    {
        timestamps: false,
        versionKey: false,
    }
);

module.exports = mongoose.model('Students', StudentSchema);