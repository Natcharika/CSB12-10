const mongoose = require("mongoose");

const superAdminSchema = new mongoose.Schema({
  sA_id: String,
  sA_password: String,
  sA_status: Boolean,
});

// Create default super admin if it doesn't already exist
superAdminSchema.statics.createDefaultSuperAdmin = async function () {
  const existingAdmin = await this.findOne({ sA_id: "admin" });
  if (!existingAdmin) {
    const superAdmin = new this({
      sA_id: "admin",
      sA_password: "admin",
      sA_status: true,
    });
    return superAdmin.save();
  }
  return existingAdmin; // Return the existing admin if found
};

const SuperAdmin = mongoose.model("superAdmin", superAdminSchema);

// Call the function to create default super admin on application start
SuperAdmin.createDefaultSuperAdmin()
  .then(() => console.log("Default super admin ensured"))
  .catch((err) => console.error("Error creating default super admin:", err));

module.exports = SuperAdmin;
