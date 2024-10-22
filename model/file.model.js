const mongoose = require("mongoose");

const PdfSchema2 = new mongoose.Schema({
  fi_id: { type: String, ref: "Students" },
  fi_file: String,
  fi_english_test: String,
  fi_result: {
    project_1: {
      summit_date: Date,
      check_date: Date,
      total_credits: {
        score: { type: Number, default: 0 },
        passed: { type: Boolean, default: false },
      },
      major_credits: {
        score: { type: Number, default: 0 },
        passed: { type: Boolean, default: false },
      },
      passed_project_1: { type: Boolean, default: false },
      comment: String,
      status: { type: String, default: "รอส่งเอกสาร" },
    },
    project_2: {
      summit_date: Date,
      check_date: Date,
      passed_project_2: { type: Boolean, default: false },
      comment: String,
      status: { type: String, default: "รอส่งเอกสาร" },
    },
  },
});

module.exports = mongoose.model("file", PdfSchema2);
