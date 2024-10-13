require("dotenv").config();
require("./config/database").connect();
const express = require("express");
const cors = require("cors");
const auth = require("./middleware/auth");
const multer = require("multer");
const bodyParser = require("body-parser");
const fs = require("fs");
const { exec } = require("child_process");
const { promisify } = require("util");
const path = require('path');

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Score = require("./model/score.model");
const Project = require("./model/project.model");
const Room = require("./model/room.model");
const Anouncement = require("./model/anouncement.model");
const Students = require("./model/student.model");
const e = require("express");
const axios = require("axios");
const Admin = require("./model/admin.model");
const Teacher = require("./model/teacher.model");
const file = require("./model/file.model");


const app = express();
app.use(cors());

app.use(bodyParser.json({ limit: "5mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "5mb" }));

app.use(express.json());

app.get("/", async (req, res) => {
  let score = await Score.find();
  res.json({ body: "hello TNP" });
});



// สร้าง CSB01 - CSB04
// app.post("/create-form", async (req, res) => {
//   const {
//     projectName,
//     projectType,
//     projectStatus,
//     projectDescription,
//     student,
//     lecturer,
//   } = req.body;
//   // status
//   // 0: Not yet
//   // 1: Done
//   // 2: Cancel
//   console.log(projectName)

//   const projects = await Project.create({
//     projectName,
//     projectType,
//     projectStatus,
//     projectDescription,
//     student,
//     lecturer,
//     scoreId: "",
//   });

//   // let calActiveStatus = lecturer.length + student.length; 
//   // let activeArray = [];
//   // calActiveStatus.map((item) => {
//   //   activeArray.push(0);
//   // })

//   const scores = await Score.create({
//     projectId: projects._id,
//     CSB01: {
//       roomExam: "",
//       dateExam: "",
//       referee: [],
//       limitReferee: 0,
//       totalScore: 0,
//       limitScore: 0,
//       activeStatus: 0,
//       resultStatus: 0,
//     },
//     CSB02: {
//       score: 0,
//       status: "",
//       referee: [],
//       limitReferee: 0,
//       totalScore: 0,
//       limitScore: 0,
//       activeStatus: 0,
//       resultStatus: 0,
//     },
//     CSB03: {
//       student: [
//         {
//           studentId: "",
//         },
//       ],
//       start_in_date: "",
//       end_in_date: "",
//       referee: [
//         {
//           keyTeacher: "",
//           status: 0,
//         },
//       ],
//       activeStatus: 0,
//       resultStatus: 0,
//     },
//     CSB04: {
//       score: 0,
//       status: "",
//       referee: [],
//       limitReferee: 0,
//       totalScore: 0,
//       limitScore: 0,
//       activeStatus: 0,
//       resultStatus: 0,
//     },
//   });

//   await Project.findByIdAndUpdate(projects._id, { scoreId: scores._id });

//   res.json({ body: { score: scores, project: projects } });
// });



app.post("/create-form", async (req, res) => {
  try {
    const {
      projectName,
      projectType,
      projectStatus,
      projectDescription,
      student,
      lecturer,
      status,
    } = req.body.data; // Accessing properties inside 'data'

    // Validate required fields
    if (
      projectName === undefined ||
      projectType === undefined ||
      projectStatus === undefined
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    console.log("Received body:", req.body); // Log the entire body
    // Create a new project
    const projects = await Project.create({
      projectName,
      projectType,
      projectStatus,
      projectDescription,
      student,
      lecturer,
      status: {
        CSB02: {
          activeStatus: 0, 
          date: new Date(), 
        },
        CSB03: {
          activeStatus: 0,
          date: new Date(),
        },
        CSB04: {
          activeStatus: 0,
          date: new Date(),
        },
      },
      scoreId: "",
    });

    // Create a new score document associated with the project
    const scores = await Score.create({
      projectId: projects._id,
      CSB01: {
        roomExam: "",
        dateExam: "",
        referee: [],
        limitReferee: 0,
        totalScore: 0,
        limitScore: 0,
        activeStatus: 0,
        resultStatus: 0,
      },
      CSB02: {
        score: 0,
        status: "",
        referee: [],
        limitReferee: 0,
        totalScore: 0,
        limitScore: 0,
        activeStatus: 0,
        resultStatus: 0,
      },
      CSB03: {
        student: [
          {
            studentId: "",
          },
        ],
        start_in_date: "",
        end_in_date: "",
        referee: [
          {
            keyTeacher: "",
            status: 0,
          },
        ],
        activeStatus: 0,
        resultStatus: 0,
      },
      CSB04: {
        score: 0,
        status: "",
        referee: [],
        limitReferee: 0,
        totalScore: 0,
        limitScore: 0,
        activeStatus: 0,
        resultStatus: 0,
      },
    });

    // Update the project with the score ID
    await Project.findByIdAndUpdate(projects._id, { scoreId: scores._id });

    res.json({ body: { score: scores, project: projects } });
  } catch (error) {
    console.error("Error creating project and score:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});






// สร้างห้องสอบ
app.post("/create-room-management", async (req, res) => {
  try {
    const { roomExam, nameExam, dateExam, referees, projects } = req.body;
    const room = await Room.create({
      roomExam,
      nameExam,
      dateExam,
      referees,
      projects,
    });

    for (const project of projects) {
      const { projectId } = project;
      const scoreUpdate = {
        roomExam,
        dateExam,
        referee: referees.map(
          ({ keyLecturer, nameLecturer, roleLecturer }) => ({
            keyLecturer,
            nameLecturer,
            roleLecturer,
            score: 0,
          })
        ),
        limitReferee: referees.length,
        totalScore: 0,
        limitScore: 100,
        resultStatus: 0,
      };
      const examField = `CSB${nameExam.split("CSB")[1]}`;
      await Score.findOneAndUpdate(
        { projectId },
        {
          $set: {
            [`${examField}.roomExam`]: scoreUpdate.roomExam,
            [`${examField}.dateExam`]: scoreUpdate.dateExam,
            [`${examField}.referee`]: scoreUpdate.referee,
            [`${examField}.limitReferee`]: scoreUpdate.limitReferee,
            [`${examField}.totalScore`]: scoreUpdate.totalScore,
            [`${examField}.limitScore`]: scoreUpdate.limitScore,
            [`${examField}.activeStatus`]: scoreUpdate.activeStatus,
            [`${examField}.resultStatus`]: scoreUpdate.resultStatus,
          },
        },
        { new: true, upsert: true }
      );
    }
    res.json({ message: "Room management and score updated successfully!" });
  } catch (error) {
    console.error("Error in creating room management:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



app.get("/teachers", async (req, res) => {
  let teacher = await Teacher.find();
  res.json({ body: teacher });
});





app.get("/project-students", async (req, res) => {
  let project = await Project.find();
  res.json({ body: project });
});



// สร้าง sp1-sp2
// app.post('/students', async (req, res) => {
//   try {
//     const { projectValidate } = req.body.data;
//     const students = await User.find({ account_type: 'students' });
//     console.log(req.body.data);
//     let studentIds = students.map(({ username, projectStatus }) => {
//       if(projectStatus[0] == projectValidate[0] && projectStatus[1] == projectValidate[1]){
//         return username.substring(1); 
//       } 
//     });
//     let projects = await Project.find({
//       'student.studentId': { $in: studentIds }
//     });
//     res.json({ body: projects });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });



// สร้างการประกาศ
app.post("/create-anouncement", async (req, res) => {
  const { examName, examStartDate, examEndDate } = req.body;
  const anouncement = await Anouncement.create({
    examName,
    examStartDate,
    examEndDate,
  });
  res.json({ body: anouncement });
});


app.get("/sumary-room", async (req, res) => {
  let room = await Room.find();
  res.json({ body: room });
});


// app.post("/create-user", async (req, res) => {
//   const { username, displayname, firstname, lastname, account_type } = req.body;
//   console.log(req.body);
//   const user = await User.create({
//     username,
//     displayname,
//     firstname,
//     lastname,
//     account_type,
//   });

//   res.json({ body: user });
// });

// app.get("/exam-management", async (req, res) => {
//   let score = await Score.find();
//   res.json({ body: score });
// });








// app.get("/students", async (req, res) => {
//   const { S_id } = req.query;
//   console.log("Received S_id:", S_id);

//   try {
//     const students = S_id
//       ? await Student.find({ S_id })
//       : await Student.find();
//     console.log("Fetched students:", students); // Log fetched students
//     res.json(students);
//   } catch (error) {
//     console.error("Error fetching students:", error);
//     res.status(500).send("Internal Server Error");
//   }
// });


// // app.get("/students/:id", async (req, res) => {
// //     try {
// //         const students = await Student.find();
// //         res.json(students);
// //     } catch (err) {
// //         console.error("Error fetching students:", err);
// //         res.status(500).send("Internal Server Error");
// //     }
// // });

// app.get("/students/:S_id", async (req, res) => {
//   const { S_id } = req.params; 
//   console.log("Received S_id:", S_id); 
  
//   try {
//     const students = await Student.findOne({ S_id }); 
//     console.log("Fetched student:", students); 
//     if (!students) {
//       return res.status(404).send("Student not found"); 
//     }
//     res.json(students); // Return the student data
//   } catch (error) {
//     console.error("Error fetching student:", error);
//     res.status(500).send("Internal Server Error");
//   }
// });


// // PUT: Update a student by ID
// app.put("/students/:id", async (req, res) => {
//   try {
//       const studentId = req.params.id;
//       const updateData = req.body;
//       const updatedStudent = await Student.findByIdAndUpdate(studentId, updateData, { new: true }); // { new: true } returns the updated document
//       if (!updatedStudent) {
//           return res.status(404).send("Student not found");
//       }
//       res.json(updatedStudent);
//   } catch (err) {
//       console.error("Error updating student:", err);
//       res.status(500).send("Internal Server Error");
//   }
// });

// // DELETE: Remove a student by ID
// app.delete("/students/:id", async (req, res) => {
//   try {
//       const studentId = req.params.id;
//       const deletedStudent = await Student.findByIdAndDelete(studentId);
//       if (!deletedStudent) {
//           return res.status(404).send("Student not found");
//       }
//       res.json({ message: "Student deleted successfully" });
//   } catch (err) {
//       console.error("Error deleting student:", err);
//       res.status(500).send("Internal Server Error");
//   }
// });

// app.post("/auth/login", async (req, res) => {
//   let { username, password } = req.body;

//   if (!username || !password) {
//       return res.status(400).json({ message: "Missing credentials" });
//   }

//   try {
//       const formData = new FormData();
//       formData.append("username", username);
//       formData.append("password", password);
//       formData.append("scopes", "student,personel");

//       const headersConfig = {
//           headers: {
//               "Access-Control-Allow-Origin": "*",
//               "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
//               Authorization: "Bearer nK6p0wT-8NVHUwB8p0e9QSYBSaIZGp9D",
//           },
//       };

//       const response = await axios.post(
//           "https://api.account.kmutnb.ac.th/api/account-api/user-authen",
//           formData,
//           headersConfig
//       );
//       console.log(response.data)
//       return res.json(response.data);
//   } catch (error) {
//       console.error("Error in login:", error);
//       return res.status(500).json({ message: "Internal Server Error" });
//   }
// });


// app.post("/auth/info", async (req, res) => {
//   const { S_id } = req.body.replace("s", "");
//   if (!S_id) {
//       return res.status(400).json({ message: "Missing username" });
//   }

//   try {
//       const formData = new FormData();
//       formData.append("username", S_id);

//       const config = {
//           method: "post",
//           url: "https://account.kmutnb.ac.th/api/account-api/user-info",
//           headers: {
//               Authorization: "Bearer nK6p0wT-8NVHUwB8p0e9QSYBSaIZGp9D",
//           },
//           data: formData,
//       };

//       const response = await axios.request(config);
//       return res.json(response.data);
//   } catch (error) {
//       console.error("Error in getting user info:", error);
//       return res.status(500).json({ message: "Internal Server Error" });
//   }
// });

// app.post("/students", async (req, res) => {
//   try {
//       const newStudentData = { ...req.body };

//       if (typeof newStudentData.S_id === "string") {
//           newStudentData.S_id = newStudentData.S_id.replace("s", "");
//       }

//       const student = new Student(newStudentData);
//       const result = await student.save();
//       res.json(result);
//   } catch (error) {
//       console.error("Error creating student:", error);
//       res.status(500).json({ message: error.message });
//   }
// });

// // PUT: อัปเดตสถานะ S_status ของนักเรียน
// app.put("/students/:id/status", async (req, res) => {
//   try {
//       const studentId = req.params.id;
//       const { S_status } = req.body;

//       // อัปเดตสถานะ S_status ในฐานข้อมูล
//       const updatedStudent = await Student.findOneAndUpdate(
//           { S_id: studentId },
//           { S_status },
//           { new: true }
//       );

//       if (!updatedStudent) {
//           return res.status(404).json({ message: "Student not found" });
//       }

//       res.json(updatedStudent);
//   } catch (error) {
//       console.error("Error updating student status:", error);
//       res.status(500).json({ message: error.message });
//   }
// });


// // PUT: อัปเดตข้อมูลนักเรียน (รวมถึง S_status)
// app.put("/students/:id", async (req, res) => {
//   try {
//       const studentId = req.params.id.replace("s", ""); // ตัด 's' ออกจาก studentId
//       const newStudentData = { ...req.body };

//       // อัปเดต S_status ถ้าถูกส่งมาใน request body
//       if (newStudentData.S_status !== undefined) {
//           newStudentData.S_status = newStudentData.S_status;
//       }

//       // อัปเดตข้อมูลนักเรียนในฐานข้อมูล
//       const updatedStudent = await Student.findOneAndUpdate(
//           { S_id: studentId },
//           newStudentData,
//           { new: true }
//       );

//       if (!updatedStudent) {
//           return res.status(404).json({ message: "Student not found" });
//       }

//       res.json(updatedStudent); // ส่งคืนข้อมูลนักเรียนที่ถูกอัปเดต
//   } catch (error) {
//       console.error("Error updating student:", error);
//       res.status(500).json({ message: error.message });
//   }
// });





app.post("/auth/login", async (req, res) => {
  let { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Missing credentials" });
  }

  try {
    const formData = new FormData();
    formData.append("username", username);
    formData.append("password", password);
    formData.append("scopes", "student,personel");

    const headersConfig = {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "Origin, X-Requested-With, Content-Type, Accept",
        Authorization: "Bearer nK6p0wT-8NVHUwB8p0e9QSYBSaIZGp9D",
      },
    };

    const response = await axios.post(
      "https://api.account.kmutnb.ac.th/api/account-api/user-authen",
      formData,
      headersConfig
    );

    console.log(response.data);
    
    return res.json(response.data);
  } catch (error) {
    console.error("Error in login:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/auth/info", async (req, res) => {
  const { S_username } = req.body.replace("s", "");
  if (!S_username) {
    return res.status(400).json({ message: "Missing username" });
  }

  try {
    const formData = new FormData();
    formData.append("username", S_username);

    const config = {
      method: "post",
      url: "https://account.kmutnb.ac.th/api/account-api/user-info",
      headers: {
        Authorization: "Bearer nK6p0wT-8NVHUwB8p0e9QSYBSaIZGp9D",
      },
      data: formData,
    };
    // {
    //   api_status: 'success',
    //   api_status_code: 202,
    //   api_message: 'Authentication success',
    //   api_timestamp: '2024-10-14 00:55:14',
    //   userInfo: {
    //     username: 's6304062620061',
    //     displayname: 'ณัชริกา กันทะสอน',
    //     firstname_en: 'NATCHARIKA',
    //     lastname_en: 'KUNTHASON',
    //     pid: '1100703269736',
    //     person_key: '',
    //     email: 's6304062620061@kmutnb.ac.th',
    //     account_type: 'students'
    //   }
    // }

    
    const response = await axios.request(config);
    // search student by username in student if not exist create one

    const username = response.userInfo.username.replace(/^s/, "")
    const student = await Students.findOne({ S_id: username });
    
    if (!student) {
      const newStudent = new Students({
        S_id: username,
        S_name: response.userInfo.displayname,
        S_email: response.userInfo.email,
        S_pid: response.userInfo.pid,
        S_account_type: response.userInfo.account_type,
      });
      await newStudent.save();
    }

    return res.json(response.data);
  } catch (error) {
    console.error("Error in getting user info:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

app.delete("/students/:username", async (req, res) => {
  const username = req.params.username;
  if (!username) {
    return res.status(400).json({ message: "Username is required" });
  }

  try {
    const result = await Student.findOneAndDelete({ S_id: username });
    if (!result) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/students", async (req, res) => {
  const { S_id } = req.query;
  console.log("Received st_id:", S_id); // Log the received st_id

  try {
    const students = S_id
      ? await Students.find({ S_id })
      : await Students.find();
    console.log("Fetched students:", students); // Log fetched students
    res.json(students);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/students", async (req, res) => {
  try {
    // Modify properties of req.body if necessary
    const newStudentData = { ...req.body };

    if (typeof newStudentData.S_id === "string") {
      newStudentData.S_id = newStudentData.S_id.replace("s", ""); // Example of replacing "s" in st_id
    }

    const student = new Students(newStudentData);
    const result = await student.save();
    res.json(result);
  } catch (error) {
    console.error("Error creating student:", error);
    res.status(500).json({ message: error.message });
  }
});

app.post('/admins', (req, res) => {
  res.status(201).send('Admin created successfully');
});


app.post('/teacher', (req, res) => {
  res.status(201).send('Teacher created successfully');
});

app.post('/assignteacher', async(req, res) => {
  const project = await Project.findOne({ projectId: req.body.projectId });
  // req.body.T_id = [T_id] find every teacher in the array
  const teacher = await Teacher.find({ T_id: { $in: req.body.T_id } });
  console.log("Project:", project);
  console.log("Teacher:", teacher);
  
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  if (!teacher) {
    return res.status(404).json({ message: "Teacher not found" });
  }

  // update project with teacher only T_id and T_name
  try{
    await Project.findByIdAndUpdate(project._id, { lecturer: teacher });
    res.json({ body: project });
  } catch (error) { 
    console.error("Error assigning teacher:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
})


//ocr
const upload = multer();

app.post("/files", upload.any("transcriptFile"), async (req, res) => {
  try {
    const studentId = req.body.std;
    const studentName = req.body.stdName;
    const directoryPath = `./ocr/upload/${studentId}`

    // ตรวจสอบและสร้างไดเรกทอรีหากยังไม่มี
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files were uploaded." });
    }

    let listfile = [];
    await Promise.all(
      req.files.map(async (file) => {
        const filePath = path.join(directoryPath, file.originalname);
        await fs.promises.writeFile(filePath, file.buffer);
        listfile.push(filePath);
      })
    );

    // ค้นหาและอัปเดตไฟล์ใน MongoDB
    let document = await file.findOne({ fi_id: studentId });

    if (!document) {
      await file.create({
        fi_id: studentId,
        fi_name: studentName,
        fi_file: listfile,
        fi_result: "",
        fi_status: "ยังไม่ได้ตรวจสอบ",
      });
    } else {
      document.fi_file = listfile;
      document.fi_status = "ยังไม่ได้ตรวจสอบ";
      await document.save();
    }

    // Execute Python script to check files
    exec(`python ./ocr/ocr.py ${studentId}`, async (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing Python script: ${error.message}`);
        return res.status(500).json({ message: "Error checking file." });
      }
      console.log(`Python script output: ${stdout}`);

      // await file.updateOne(
      //   { fi_id: studentId },
      //   {
      //     $set: {
      //       fi_result: result,
      //       fi_status: "ได้รับการตรวจสอบแล้ว",
      //     },
      //   }
      // );

      res
        .status(200)
        .json({ message: "Files uploaded" });
    });
  } catch (error) {
    console.error("Error in file upload process:", error);
    res.status(500).json({ message: "Server error during file upload." });
  }
});

app.patch("/files/:fi_id", async (req, res) => {
    const { fi_id } = req.params;
    
    try {
      const result = await file.findOneAndUpdate(
        { fi_id },
        { new: true }
      );
  
      if (!result) {
        return res.status(404).json({ message: "File not found." });
      }
  
      res.status(200).json({ message: "File status updated successfully.", result });
    } catch (error) {
      console.error("Error updating file status:", error);
      res.status(500).json({ message: "Error updating file status." });
    }
  });

module.exports = app;
