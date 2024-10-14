const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  A_id: String,
  A_name: String,
  A_firstname_en: String,
  A_lastname_en: String,
  A_password: String,
  A_email: String,
  A_account_type: String,
  A_status: Boolean,
});

module.exports = mongoose.model("Admin", adminSchema);
