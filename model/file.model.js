const mongoose = require('mongoose');

const PdfSchema2 = new mongoose.Schema({
    fi_id: { type: String, ref: "Students" },
    fi_name: { type: String, ref: "Students" },
    fi_file: [String],
    fi_result: String,
    fi_status: { type: String, default: "ยังไม่ได้ตรวจสอบ" },
  });
  
module.exports = mongoose.model("file", PdfSchema2);