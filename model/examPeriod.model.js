const mongoose = require("mongoose");

const examPeriodSchema = new mongoose.Schema({
  examName: String,
  examStatus: Boolean,
});

// Create default super admin if it doesn't already exist
examPeriodSchema.statics.createDefaultExamPeriod = async function () {
  // create csb01, csb02, csb03, csb04 to status false
  const examPeriods = [
    { examName: "สอบหัวข้อ", examStatus: false },
    { examName: "สอบก้าวหน้า", examStatus: false },
    { examName: "ยื่นทดสอบโครงงาน", examStatus: false },
    { examName: "สอบป้องกัน", examStatus: false },
  ];

  //ensure database dont have any examPeriod

  const examPeriod = await this.find();
  if (examPeriod.length > 0) {
    return;
  }

  await this.insertMany(examPeriods);
};

const ExamPeriod = mongoose.model("examPeriod", examPeriodSchema);

// Call the function to create default super admin on application start
ExamPeriod.createDefaultExamPeriod()
  .then(() => console.log("Default examPeriods created"))
  .catch((err) => console.error("Error from create examPeriods:", err));

module.exports = ExamPeriod;
