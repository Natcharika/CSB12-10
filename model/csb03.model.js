const mongoose = require("mongoose");

const csb03Schema = new mongoose.Schema({
  projectId: String,
  // csb03Status: {
  //     activeStatus: { type: Number, enum: [0, 1, 2], default: 0 }, // 0: nothing, 1: student action, 2: lecturer action
  //     status: {type: String, enum: ["รอดำเนินการ", "ไม่ผ่าน", "ผ่าน"], default: "รอดำเนินการ"},
  //     date: { type: Date, default: Date.now }
  // },
  startDate: String,
  endDate: String,
  organization: String,
});

module.exports = mongoose.model("csb03", csb03Schema);
