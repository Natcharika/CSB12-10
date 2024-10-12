const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: String,
  displayname: String,
  firstname_en: String,
  lastname_en: String,
  account_type: String,
  projectStatus : Array,
});

module.exports = mongoose.model("User", userSchema);
