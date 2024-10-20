const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
    T_id: String,
    T_name: String,
    T_firstname_en: String,
    T_lastname_en: String,
    T_email: String,
    T_account_type: String,
    T_status: Boolean,
    T_super_role:String,
}, {
    timestamps: false,
    versionKey: false,
});

module.exports = mongoose.model('Teacher', teacherSchema);
