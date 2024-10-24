require("dotenv").config();
require("./config/database").connect();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const jwt = require("jsonwebtoken");
const Project = require("./model/project.model");
const Room = require("./model/room.model");
const Students = require("./model/student.model");
const axios = require("axios");
const Admin = require("./model/admin.model");
const Teacher = require("./model/teacher.model");
const file = require("./model/file.model");
const csb01 = require("./model/csb01.model");
const csb02 = require("./model/csb02.model");
const csb03 = require("./model/csb03.model");
const csb04 = require("./model/csb04.model");
const superAdmin = require("./model/superAdmin.model");
const whitelist = require("./model/whitelist.model");
const ExamPeriod = require("./model/examPeriod.model");

// const adminUser = ["nateep", "alisah", "kriangkraia", "chantimap"];

const middlewareExtractJwt = (req, res, next) => {
  const token = req.header("Authorization").split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Auth Error" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    next();
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Invalid Token" });
  }
};

const verifyRoleSuperAdminAndAdmin = (req, res, next) => {
  const { role } = req.user;
  console.log("roles", role);
  if (role === "superAdmin" || role === "admin") {
    console.log("roles", role);

    next();
  } else {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "5mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "5mb" }));
// app.use(cors({
//   origin: "http://202.44.40.169:3000" || "http://202.44.40.169:8788", // or specify the allowed origin(s)
//   methods: ['GET', 'POST', 'PUT', 'DELETE','PATCH'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
// }));

app.use(express.json());

app.post("/create-form", async (req, res) => {
  try {
    console.log("Received body:", JSON.stringify(req.body));
    const {
      projectName,
      projectType,
      projectStatus,
      projectDescription,
      student,
      status, // Accept activeStatus from the request body
    } = req.body.data; // Accessing properties inside 'data'

    // Validate required fields
    if (
      projectName === undefined ||
      projectType === undefined ||
      projectStatus === undefined ||
      status === undefined // Ensure activeStatus is also provided
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Create a new project
    const projects = new Project({
      projectName,
      projectType,
      projectStatus,
      projectDescription,
      student,
      status: { CSB01: { activeStatus: 1 } },
    });

    const savedData = await projects.save();
    res.json({ body: { project: savedData } });
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// app.post("/create-form", async (req, res) => {
//   try {
//     const {
//       projectName,
//       projectType,
//       projectStatus,
//       projectDescription,
//       student,
//     } = req.body.data; // Accessing properties inside 'data'

//     // Validate required fields
//     if (
//       projectName === undefined ||
//       projectType === undefined ||
//       projectStatus === undefined
//     ) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     console.log("Received body:", req.body); // Log the entire bodys
//     // Create a new project
//     const projects = new Project({
//       projectName,
//       projectType,
//       projectStatus,
//       projectDescription,
//       student,
//     });

//     const savedData = await projects.save();
//     console.log("Saved project:", savedData); // Log the saved project

//     // await Project.findByIdAndUpdate(projects._id);

//     res.json({ body: { project: savedData } });
//   } catch (error) {
//     console.error("Error creating project and score:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

// Updated route to reflect changes

app.post(
  "/create-room-management",
  middlewareExtractJwt,
  verifyRoleSuperAdminAndAdmin,
  async (req, res) => {
    try {
      const { roomExam, nameExam, dateExam, teachers, projects } = req.body; // Updated referees to teachers
      if (!teachers || !Array.isArray(teachers)) {
        return res
          .status(400)
          .json({ error: "Teachers must be a defined array" });
      }
      // Check if the room is already booked for the given date
      const existingRoom = await Room.findOne({
        roomExam: roomExam,
        dateExam: dateExam,
      });
      if (existingRoom) {
        return res.status(400).json({
          error:
            "ห้องสอบนี้ได้ถูกจัดไว้แล้วในวันที่เลือก กรุณาเลือกวันอื่นหรือห้องสอบอื่น",
        });
      }

      //ensure that every project is not booked in room status is กำลังดำเนินการ
      console.log("Projects:", projects);

      for (const project of projects) {
        const existingProject = await Room.findOne({
          "projects.projectId": project.projectId,
          status: "กำลังดำเนินการ",
        });

        if (existingProject) {
          return res.status(400).json({
            error:
              "โปรเจคนี้ได้ถูกจัดไว้แล้วในห้องสอบอื่น กรุณาเลือกโปรเจคอื่นหรือห้องสอบอื่น",
          });
        }
      }

      await Room.create({
        roomExam,
        nameExam: nameExam,
        dateExam,
        teachers: teachers,
        projects,
        status: "กำลังดำเนินการ",
      });

      for (const project of projects) {
        const { projectId } = project;
        var exam;
        if (nameExam == "สอบหัวข้อ") {
          exam = new csb01({
            projectId,
            confirmScore: 0,
            unconfirmScore: 0,
            referee: teachers.map(({ T_id, T_name, role }) => ({
              T_id,
              T_name,
              role,
              score: 0,
              comment: "",
              status: "รอดำเนินการ",
            })),
          });
        } else if (nameExam == "สอบก้าวหน้า") {
          exam = new csb02({
            projectId,
            confirmScore: 0,
            unconfirmScore: 0,
            logBookScore: 0,
            referee: teachers.map(({ T_id, T_name, role }) => ({
              T_id,
              T_name,
              role,
              score: 0,
              comment: "",
              status: "รอดำเนินการ",
            })),
          });
        } else if (nameExam == "สอบป้องกัน") {
          exam = new csb04({
            projectId,
            confirmScore: 0,
            unconfirmScore: 0,
            exhibitionScore: 0,
            referee: teachers.map(({ T_id, T_name, role }) => ({
              T_id,
              T_name,
              role,
              score: 0,
              comment: "",
              status: "รอดำเนินการ",
            })),
          });
        }
        await exam.save();
      }

      return res.json({
        message: "อัปเดตการจัดห้องสอบสำเร็จแล้ว!",
      });
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการจัดห้องสอบ:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

app.post("/check-room-Teachers", async (req, res) => {
  const { roomExam, dateExam, nameExam } = req.body;

  try {
    const existingRoom = await Room.findOne({
      roomExam,
      dateExam: new Date(dateExam), // Ensure the date format matches
      nameExam,
      "teachers.0": { $exists: true }, // Check if at least one teacher exists
    });

    if (existingRoom) {
      return res.json({ roomExists: true });
    } else {
      return res.json({ roomExists: false });
    }
  } catch (error) {
    console.error("Error checking room with teachers:", error);
    res.status(500).json({ error: "Server error" });
  }
});

//ของเก่าห้ามลบ

// app.post("/create-room-management", async (req, res) => {
//   try {
//     const { projectId, roomExam, nameExam, dateExam, teachers, projects } =
//       req.body;
//     if (!teachers || !Array.isArray(teachers)) {
//       return res
//         .status(400)
//         .json({ error: "Teachers must be a defined array" });
//     }
//     const existingRoom = await Room.findOne({
//       roomExam: roomExam,
//       dateExam: dateExam,
//       "projects.start_in_time": { $in: projects.map((p) => p.start_in_time) },
//     });

//     if (existingRoom) {
//       return res
//         .status(400)
//         .json({ error: "ห้องสอบนี้มีอยู่แล้วในวันและเวลาที่กำหนด" });
//     }

//     // ถ้าไม่มีห้องสอบซ้ำ สร้างห้องใหม่
//     const room = await Room.create({
//       roomExam,
//       nameExam: req.body.nameExam,
//       dateExam,
//       teachers: req.body.teachers,
//       projects,
//     });

//     // Create exams for each project
//     for (const project of projects) {
//       const { projectId } = project;
//       let exam;

//       switch (nameExam) {
//         case "สอบหัวข้อ":
//           exam = new csb01({
//             projectId,
//             confirmScore: 0,
//             unconfirmScore: 0,
//             referee: teachers.map(({ T_id, T_name, role }) => ({
//               T_id,
//               T_name,
//               role,
//               score: 0,
//               comment: "",
//               status: "รอดำเนินการ",
//             })),
//           });
//           break;

//         case "สอบก้าวหน้า":
//           exam = new csb02({
//             projectId,
//             confirmScore: 0,
//             unconfirmScore: 0,
//             logBookScore: 0,
//             referee: teachers.map(({ T_id, T_name, role }) => ({
//               T_id,
//               T_name,
//               role,
//               score: 0,
//               comment: "",
//               status: "รอดำเนินการ",
//             })),
//           });
//           break;

//         case "สอบป้องกัน":
//           exam = new csb04({
//             projectId,
//             confirmScore: 0,
//             unconfirmScore: 0,
//             exhibitionScore: 0,
//             referee: teachers.map(({ T_id, T_name, role }) => ({
//               T_id,
//               T_name,
//               role,
//               score: 0,
//               comment: "",
//               status: "รอดำเนินการ",
//             })),
//           });
//           break;

//         default:
//           return res.status(400).json({ error: "Invalid exam type" });
//       }

//       // Save each exam instance
//       const result = await exam.save();
//       if (!result) {
//         return res.status(400).json({ error: "Error creating exam" });
//       }
//     }

//     res.json({ message: "Room management and score updated successfully!" });
//   } catch (error) {
//     console.error("Error in creating room management:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

// app.post("/create-room-management", async (req, res) => {
//   try {
//     const { roomExam, nameExam, dateExam, teachers, projects } = req.body; // Updated referees to teachers
//     if (!teachers || !Array.isArray(teachers)) {
//       return res
//         .status(400)
//         .json({ error: "Teachers must be a defined array" });
//     }

//     const room = await Room.create({
//       roomExam,
//       nameExam,
//       dateExam,
//       teachers,
//       projects,
//     });

//     for (const project of projects) {
//       const { projectId } = project;
//       const scoreUpdate = {
//         roomExam,
//         dateExam,
//         referee: teachers.map(
//           // Updated referees to teachers
//           ({ T_id, T_name, role }) => ({
//             T_id,
//             T_name,
//             role,
//             score: 0,
//           })
//         ),
//         limitReferee: teachers.length, // Updated referees to teachers
//         totalScore: 0,
//         limitScore: 100,
//         resultStatus: 0,
//       };
//       const examField = `CSB${nameExam.split("CSB")[1]}`;
//       await Score.findOneAndUpdate(
//         { projectId },
//         {
//           $set: {
//             [`${examField}.roomExam`]: scoreUpdate.roomExam,
//             [`${examField}.dateExam`]: scoreUpdate.dateExam,
//             [`${examField}.referees`]: scoreUpdate.referee, // Retain referees field for Score schema
//             [`${examField}.limitReferee`]: scoreUpdate.limitReferee,
//             [`${examField}.totalScore`]: scoreUpdate.totalScore,
//             [`${examField}.limitScore`]: scoreUpdate.limitScore,
//             [`${examField}.activeStatus`]: scoreUpdate.activeStatus,
//             [`${examField}.resultStatus`]: scoreUpdate.resultStatus,
//           },
//         },
//         { new: true, upsert: true }
//       );
//     }
//     res.json({ message: "Room management and score updated successfully!" });
//   } catch (error) {
//     console.error("Error in creating room management:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

//แต่งตั้งหัวหน้าภาค
// app.post("/appointHeadOfDepartment", async (req, res) => {
//   try {
//     const { T_id, T_name, T_super_role } = req.body;

//     // Validate the input data
//     if (!T_id || !T_name || !T_super_role) {
//       return res.status(400).json({ error: "All fields are required" });
//     }

//     // Check if a Head of Department is already appointed
//     const existingHead = await Teacher.findOne({ T_super_role: "head" });

//     if (existingHead) {
//       // If there is an existing Head, update their role to something else
//       await Teacher.findByIdAndUpdate(existingHead._id, {
//         $set: { T_super_role: "Teacher" }, // or another appropriate role
//       });
//     }

//     // Now appoint the new Head of Department
//     const updatedTeacher = await Teacher.findOneAndUpdate(
//       { T_id },
//       {
//         $set: {
//           T_name,
//           T_super_role, // Assign the new role as Head of Department
//         },
//       },
//       { new: true, upsert: true }
//     );

//     if (!updatedTeacher) {
//       return res.status(404).json({ error: "Teacher not found" });
//     }

//     res.json({
//       message: "Head of Department appointed successfully",
//       teacher: updatedTeacher,
//     });
//   } catch (error) {
//     console.error("Error in appointing Head of Department:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

app.get("/projects", async (req, res) => {
  let Projects = await Project.find();
  res.json({ body: Projects });
});

app.get("/students", async (req, res) => {
  let Projects = await Students.find();
  res.json({ body: Projects });
});

app.get("/students", async (req, res) => {
  let Projects = await Students.find();
  res.json({ body: Projects });
});

//activecsb01
app.post("/student-csb01", async (req, res) => {
  const { projectId, activeStatus, status } = req.body.params;
  try {
    console.log(
      new Date().toLocaleString("en-TH", { timeZone: "Asia/Bangkok" })
    );

    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      {
        "status.CSB01.activeStatus": activeStatus,
        "status.CSB01.status": status || "รอดำเนินการ",
        "status.CSB01.date": new Date(),
      },
      { new: true }
    );

    if (!updatedProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json({
      message: "ยื่นสอบหัวข้อสำเร็จ",
      project: updatedProject,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error : ยื่นสอบหัวข้อไม่สำเร็จ" });
  }
});

// app.post("/approveCSB01", async (req, res) => {
//   const { projectId, activeStatus } = req.body.params;
//   try {
//     const updatedProject = await Project.findOneAndUpdate(
//         projectId ,
//       {
//         "status.CSB01.activeStatus": activeStatus,
//         "status.CSB01.status": "ผ่านการอนุมัติจากอาจารย์",
//         "status.CSB01.date": new Date(),
//       },
//       { new: true }
//     );

//     if (!updatedProject) {
//       return res.status(404).send({ message: "Project not found" });
//     }

//     res.status(200).send({ message: "Project ผ่านการอนุมัติจากอาจารย์ successfully!", data: updatedProject });
//   } catch (error) {
//     console.error(error);
//     res.status(500).send({ message: "Server error, please try again." });
//   }
// });

// app.post("/approveCSB01", async (req, res) => {
//   const { projectId, activeStatus } = req.body.params; // Change this to req.body directly

//   // Check if projectId and activeStatus are provided
//   if (!projectId || activeStatus === undefined) {
//     return res
//       .status(400)
//       .send({ message: "projectId and activeStatus are required." });
//   }

//   try {
//     const updatedProject = await Project.findOneAndUpdate(
//       { _id: projectId }, // Ensure you're using an object for the query
//       {
//         "status.CSB01.activeStatus": activeStatus,
//         "status.CSB01.status": "ผ่านการอนุมัติจากอาจารย์",
//         "status.CSB01.date": new Date(),
//       },
//       { new: true }
//     );

//     if (!updatedProject) {
//       return res.status(404).send({ message: "Project not found" });
//     }

//     res.status(200).send({
//       message: "Project ผ่านการอนุมัติจากอาจารย์ successfully!",
//       data: updatedProject,
//     });
//   } catch (error) {
//     console.error("Error approving project:", error); // More specific error logging
//     res.status(500).send({
//       message: "Server error, please try again.",
//       error: error.message,
//     });
//   }
// });

// app.post("/rejectCSB01", async (req, res) => {
//   const { projectId, activeStatus } = req.body.params;

//   if (!projectId || activeStatus === undefined) {
//     return res
//       .status(400)
//       .send({ message: "projectId and activeStatus are required." });
//   }

//   try {
//     const updatedProject = await Project.findOneAndUpdate(
//       { _id: projectId },
//       {
//         "status.CSB01.activeStatus": activeStatus,
//         "status.CSB01.status": "ไม่ผ่าน",
//         "status.CSB01.date": new Date(),
//       },
//       { new: true }
//     );

//     if (!updatedProject) {
//       return res.status(404).send({ message: "Project not found" });
//     }

//     res.status(200).send({
//       message: "Project rejected successfully!",
//       data: updatedProject,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).send({ message: "Server error, please try again." });
//   }
// });

app.post("/score-csb01", async (req, res) => {
  const { projectId, unconfirmScore, comment, referee } = req.body.params;

  try {
    // Check if a document with the given projectId already exists
    let existingCsb01 = await csb01.findOne({ projectId });

    if (existingCsb01) {
      // Update the existing document
      existingCsb01.unconfirmScore = unconfirmScore;
      existingCsb01.referee = referee || [];
      existingCsb01.comment = comment || "";
      const updatedCsb01 = await existingCsb01.save();

      // Send the updated document back with all fields included
      res.json({
        message: "อัปเดตคะแนนการสอบหัวข้อสำเร็จ",
        project: {
          _id: updatedCsb01._id,
          projectId: updatedCsb01.projectId,
          unconfirmScore: updatedCsb01.unconfirmScore,
          comment: updatedCsb01.comment,
          referee: updatedCsb01.referee,
        },
      });
    } else {
      // Create a new document if it doesn't exist
      const newCsb01 = new csb01({
        projectId,
        unconfirmScore,
        referee,
        comment,
      });

      const savedCsb01 = await newCsb01.save();

      // Send the newly created document back with all fields included
      res.json({
        message: "บันทึกคะแนนการสอบหัวข้อสำเร็จ",
        project: {
          _id: savedCsb01._id,
          projectId: savedCsb01.projectId,
          unconfirmScore: savedCsb01.unconfirmScore,
          comment: savedCsb01.comment,
          referee: savedCsb01.referee,
        },
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "อัปเดตคะแนนการสอบหัวข้อผิดพลาด",
      error: error.message,
    });
  }
});

//chaircsb01
app.get("/csb01", async (req, res) => {
  let Csb01 = await csb01.find();
  res.json({ body: Csb01 });
});

app.post("/chair-csb01", async (req, res) => {
  const { _id, unconfirmScore, activeStatus } = req.body.params;
  // const { projectId, confirmScore, logBookScore } = req.body.params;

  try {
    // Check if an entry for the project already exists
    // let existingCsb01 = await csb01.findOne({ projectId });

    const confirmScore = parseInt(unconfirmScore); //04เปลี่ยนๆ
    const existingCsb01 = await csb01.findByIdAndUpdate(
      _id,
      {
        $set: {
          activeStatus,
          unconfirmScore: parseInt(unconfirmScore),
          confirmScore,
        },
      },
      { new: true }
    );

    if (!existingCsb01) {
      return res.status(404).json({ message: "CSB01 not found" });
    }

    const isPassed = confirmScore >= 55;
    console.log("existingCsb01: ", existingCsb01);

    const updatedProject = await Project.findByIdAndUpdate(
      { _id: existingCsb01.projectId },
      {
        "status.CSB01.activeStatus": activeStatus,
        "status.CSB01.status": isPassed ? "ผ่าน" : "ไม่ผ่าน",
        "status.CSB01.score": confirmScore,
        "status.CSB01.date": new Date(),
      },
      { new: true }
    );

    if (!updatedProject) {
      return res.status(404).json({ message: "Project not found." });
    }

    // update room to status ดำเนินการเสร็จสิ้น if all project in room are finished

    const room = await Room.findOne({
      "projects.projectId": existingCsb01.projectId,
      status: "กำลังดำเนินการ",
    });
    if (!room) {
      return res.status(404).json({ message: "Room not found." });
    }

    await Promise.all(
      room.projects.map(async (project) => {
        const data = await csb01.findOne({ projectId: project.projectId });
        return data?.confirmScore !== 0;
      })
    ).then(async (results) => {
      const allPass = results.every((result) => result === true);
      if (allPass) {
        await Room.findByIdAndUpdate(room._id, {
          status: "ดำเนินการเสร็จสิ้น",
        });
      }
    });

    res.json({
      message: "ยื่นสอบหัวข้อสำเร็จ",
      project: updatedProject,
    });
  } catch (error) {
    console.error("Error saving CSB01:", error);
    return res
      .status(500)
      .json({ message: "Server error, please try again later." });
  }
});

app.post("/depart-csb01", async (req, res) => {
  const { projectId, activeStatus } = req.body.params;

  // Validate input
  if (!projectId || activeStatus === undefined) {
    return res
      .status(400)
      .send({ message: "projectId and activeStatus are required." });
  }

  try {
    const updatedProject = await Project.findOneAndUpdate(
      { _id: projectId },
      {
        "status.CSB01.activeStatus": activeStatus,
        "status.CSB01.status": "ผ่าน",
        "status.CSB01.date": new Date(),
      },
      { new: true }
    );

    // Check if the project was found and updated
    if (!updatedProject) {
      return res.status(404).send({ message: "ไม่มีโครงงานนี้" });
    }

    // Send a success response
    res.status(200).json({ message: "อัปเดตคะแนนสำเร็จ", updatedProject });
  } catch (error) {
    console.error("อัปเดตคะแนนผิดพลาด:", error);
    res
      .status(500)
      .json({ message: "อัปเดตคะแนนผิดพลาด", error: error.message });
  }
});

//activecsb02
app.post("/student-csb02", async (req, res) => {
  const { projectId, activeStatus, status } = req.body.params;
  try {
    console.log(
      new Date().toLocaleString("en-TH", { timeZone: "Asia/Bangkok" })
    );

    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      {
        "status.CSB02.activeStatus": activeStatus,
        "status.CSB02.status": status || "รอดำเนินการ",
        "status.CSB02.date": new Date(),
      },
      { new: true }
    );

    if (!updatedProject) {
      return res.status(404).json({ message: "ไม่มีโครงงานนี้" });
    }

    res.json({
      message: "ยื่นสอบก้าวหน้าสำเร็จ",
      project: updatedProject,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error : ยื่นสอบก้าวหน้าไม่สำเร็จ" });
  }
});

// app.post("/approveCSB02", async (req, res) => {
//   const { projectId, activeStatus } = req.body.params;
//   try {
//     const updatedProject = await Project.findOneAndUpdate(
//         projectId ,
//       {
//         "status.CSB02.activeStatus": activeStatus,
//         "status.CSB02.status": "ผ่านการอนุมัติจากอาจารย์",
//         "status.CSB02.date": new Date(),
//       },
//       { new: true }
//     );

//     if (!updatedProject) {
//       return res.status(404).send({ message: "Project not found" });
//     }

//     res.status(200).send({ message: "Project ผ่านการอนุมัติจากอาจารย์ successfully!", data: updatedProject });
//   } catch (error) {
//     console.error(error);
//     res.status(500).send({ message: "Server error, please try again." });
//   }
// });

app.post("/approveCSB02", async (req, res) => {
  const { projectId, activeStatus } = req.body.params; // Change this to req.body directly

  // Check if projectId and activeStatus are provided
  if (!projectId || activeStatus === undefined) {
    return res
      .status(400)
      .send({ message: "projectId and activeStatus are required." });
  }

  try {
    const updatedProject = await Project.findOneAndUpdate(
      { _id: projectId }, // Ensure you're using an object for the query
      {
        "status.CSB02.activeStatus": activeStatus,
        "status.CSB02.status": "ผ่านการอนุมัติจากอาจารย์",
        "status.CSB02.date": new Date(),
      },
      { new: true }
    );

    if (!updatedProject) {
      return res.status(404).send({ message: "ไม่มีโครงงานนี้" });
    }

    res.status(200).send({
      message: "โครงงานนี้ผ่านการอนุมัติจากอาจารย์สำเร็จ!",
      data: updatedProject,
    });
  } catch (error) {
    console.error("ผิดพลาดในการอนุมัติโครงงาน:", error); // More specific error logging
    res.status(500).send({
      message: "ระบบมีปัญหา โปรดลองอีกครั้ง",
      error: error.message,
    });
  }
});

app.post("/rejectCSB02", async (req, res) => {
  const { projectId, activeStatus } = req.body.params;

  if (!projectId || activeStatus === undefined) {
    return res
      .status(400)
      .send({ message: "projectId and activeStatus are required." });
  }

  try {
    const updatedProject = await Project.findOneAndUpdate(
      { _id: projectId },
      {
        "status.CSB02.activeStatus": activeStatus,
        "status.CSB02.status": "ไม่ผ่าน",
        "status.CSB02.date": new Date(),
      },
      { new: true }
    );

    if (!updatedProject) {
      return res.status(404).send({ message: "ไม่มีโครงงานนี้" });
    }

    res.status(200).send({
      message: "ปฏิเสธสำเร็จ!",
      data: updatedProject,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Server error, please try again." });
  }
});

app.post("/score-csb", middlewareExtractJwt, async (req, res) => {
  const { _id, score, comment, nameExam } = req.body.params;
  const { username } = req.user;
  console.log("req.body", req.body);

  try {
    if (nameExam == "สอบหัวข้อ") {
      let existingCsb01 = await csb01.findOneAndUpdate(
        {
          _id: _id, // The document ID to match
          "referee.T_id": username, // Find the specific referee with the matching T_id
        },
        {
          $set: {
            "referee.$.score": score, // Update the score for the matching referee
            "referee.$.comment": comment, // Update comment for the matching referee
            "referee.$.status": "ผ่านการอนุมัติจากอาจารย์", // Update status for the matching referee
          },
        },
        { new: true } // Return the updated document
      );

      if (!existingCsb01) {
        return res.status(404).json({ message: "CSB01 not found" });
      }

      // Check if all referees have a status other than "รอดำเนินการ"
      const allNotWaiting = existingCsb01.referee.every(
        (ref) => ref.status !== "รอดำเนินการ"
      );

      const approvedReferees = existingCsb01.referee.filter(
        (ref) => ref.status === "ผ่านการอนุมัติจากอาจารย์"
      );

      let unconfirmScore = 0;
      if (approvedReferees.length > 0 && allNotWaiting) {
        // Calculate unconfirmScore by summing the scores of ผ่านการอนุมัติจากอาจารย์ referees and dividing by their count
        const totalScore = approvedReferees.reduce(
          (sum, ref) => sum + ref.score,
          0
        );
        unconfirmScore = totalScore / approvedReferees.length;

        // Update the unconfirmScore field in the document
        await csb01.findByIdAndUpdate(
          _id,
          { $set: { unconfirmScore } },
          { new: true }
        );
      }

      return res.json({
        message: "อัปเดตคะแนนสอบหัวข้อสำเร็จ",
        project: existingCsb01,
        unconfirmScore,
      });
    }

    if (nameExam == "สอบก้าวหน้า") {
      let existingCsb02 = await csb02.findOneAndUpdate(
        {
          _id: _id, // The document ID to match
          "referee.T_id": username, // Find the specific referee with the matching T_id
        },
        {
          $set: {
            "referee.$.score": score, // Update the score for the matching referee
            "referee.$.comment": comment, // Update comment for the matching referee
            "referee.$.status": "ผ่านการอนุมัติจากอาจารย์", // Update status for the matching referee
          },
        },
        { new: true } // Return the updated document
      );

      if (!existingCsb02) {
        return res.status(404).json({ message: "CSB02 not found" });
      }

      const allNotWaiting = existingCsb02.referee.every(
        (ref) => ref.status !== "รอดำเนินการ"
      );

      const approvedReferees = existingCsb02.referee.filter(
        (ref) => ref.status === "ผ่านการอนุมัติจากอาจารย์"
      );

      let unconfirmScore = 0;
      if (approvedReferees.length > 0 && allNotWaiting) {
        // Calculate unconfirmScore by summing the scores of ผ่านการอนุมัติจากอาจารย์ referees and dividing by their count
        const totalScore = approvedReferees.reduce(
          (sum, ref) => sum + ref.score,
          0
        );
        unconfirmScore = totalScore / approvedReferees.length;

        // Update the unconfirmScore field in the document
        await csb02.findByIdAndUpdate(
          _id,
          { $set: { unconfirmScore } },
          { new: true }
        );
      }

      return res.json({
        message: "อัปเดตคะแนนสอบก้าวหน้าสำเร็จ",
        project: existingCsb02,
        unconfirmScore,
      });
    }

    if (nameExam == "สอบป้องกัน") {
      let existingCsb04 = await csb04.findOneAndUpdate(
        {
          _id: _id, // The document ID to match
          "referee.T_id": username, // Find the specific referee with the matching T_id
        },
        {
          $set: {
            "referee.$.score": score, // Update the score for the matching referee
            "referee.$.comment": comment, // Update comment for the matching referee
            "referee.$.status": "ผ่านการอนุมัติจากอาจารย์", // Update status for the matching referee
          },
        },
        { new: true } // Return the updated document
      );

      if (!existingCsb04) {
        return res.status(404).json({ message: "CSB04 not found" });
      }

      const allNotWaiting = existingCsb04.referee.every(
        (ref) => ref.status !== "รอดำเนินการ"
      );

      const approvedReferees = existingCsb04.referee.filter(
        (ref) => ref.status === "ผ่านการอนุมัติจากอาจารย์"
      );

      let unconfirmScore = 0;
      if (approvedReferees.length > 0 && allNotWaiting) {
        // Calculate unconfirmScore by summing the scores of ผ่านการอนุมัติจากอาจารย์ referees and dividing by their count
        const totalScore = approvedReferees.reduce(
          (sum, ref) => sum + ref.score,
          0
        );
        unconfirmScore = totalScore / approvedReferees.length;

        // Update the unconfirmScore field in the document
        await csb04.findByIdAndUpdate(
          _id,
          { $set: { unconfirmScore } },
          { new: true }
        );
      }

      return res.json({
        message: "อัปเดตคะแนนสอบป้องกันสำเร็จ",
        project: existingCsb04,
        unconfirmScore,
      });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "อัปเดตคะแนนผิดพลาด", error: error.message });
  }
});

app.post("/reject-score", middlewareExtractJwt, async (req, res) => {
  const { _id, nameExam } = req.body.params;
  const { username } = req.user;

  try {
    const collectionMapper = {
      สอบหัวข้อ: csb01,
      สอบก้าวหน้า: csb02,
      สอบป้องกัน: csb04,
    };

    const collection = collectionMapper[nameExam];
    if (!collection) {
      return res.status(400).json({ message: "Invalid exam type" });
    }

    const existingExam = await collection.findOneAndUpdate(
      {
        _id,
        "referee.T_id": username,
      },
      {
        $set: {
          "referee.$.score": 0,
          "referee.$.comment": "",
          "referee.$.status": "ไม่ประเมิน",
        },
      },
      { new: true }
    );

    const allNotWaiting = existingExam.referee.every(
      (ref) => ref.status !== "รอดำเนินการ"
    );

    const approvedReferees = existingExam.referee.filter(
      (ref) => ref.status === "ผ่านการอนุมัติจากอาจารย์"
    );

    let unconfirmScore = 0;
    if (approvedReferees.length > 0 && allNotWaiting) {
      // Calculate unconfirmScore by summing the scores of ผ่านการอนุมัติจากอาจารย์ referees and dividing by their count
      const totalScore = approvedReferees.reduce(
        (sum, ref) => sum + ref.score,
        0
      );
      unconfirmScore = totalScore / approvedReferees.length;

      // Update the unconfirmScore field in the document
      await collection.findByIdAndUpdate(
        _id,
        { $set: { unconfirmScore } },
        { new: true }
      );
    }

    if (!existingExam) {
      return res.status(404).json({ message: "ไม่มีการสอบนี้" });
    }

    return res.json({
      message: "ปฏิเสธการประเมินคะแนนสำเร็จ",
      project: existingExam,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "ปฏิเสธการประเมินคะแนนผิดพลาด", error: error.message });
  }
});

//chaircsb02
app.get("/csb02", async (req, res) => {
  let Csb02 = await csb02.find();
  res.json({ body: Csb02 });
});

app.post("/chair-csb02", async (req, res) => {
  const { _id, unconfirmScore, logBookScore, activeStatus } = req.body.params; //04เปลี่ยนๆ

  try {
    // Check if an entry for the project already exists
    const confirmScore = parseInt(unconfirmScore) + parseInt(logBookScore); //04เปลี่ยนๆ
    const existingCsb02 = await csb02.findByIdAndUpdate(
      _id,
      {
        $set: {
          activeStatus,
          unconfirmScore: parseInt(unconfirmScore),
          logBookScore: parseInt(logBookScore),
          confirmScore,
        },
      },
      { new: true }
    );

    if (!existingCsb02) {
      return res.status(404).json({ message: "CSB02 not found" });
    }

    const isPassed = confirmScore >= 55; //04เปลี่ยน

    // Update the project status first
    const updatedProject = await Project.findOneAndUpdate(
      { _id: existingCsb02.projectId },
      {
        "status.CSB02.activeStatus": activeStatus,
        "status.CSB02.status": isPassed ? "ผ่าน" : "ไม่ผ่าน",
        "status.CSB02.score": confirmScore,
        "status.CSB02.date": new Date(),
      },
      { new: true }
    );

    if (!updatedProject) {
      return res.status(404).json({ message: "Project not found." });
    }

    const room = await Room.findOne({
      "projects.projectId": existingCsb02.projectId,
      status: "กำลังดำเนินการ",
    });
    if (!room) {
      return res.status(404).json({ message: "Room not found." });
    }

    await Promise.all(
      room.projects.map(async (project) => {
        const data = await csb02.findOne({ projectId: project.projectId });
        return data?.confirmScore !== 0;
      })
    ).then(async (results) => {
      const allPass = results.every((result) => result === true);
      if (allPass) {
        await Room.findByIdAndUpdate(room._id, {
          status: "ดำเนินการเสร็จสิ้น",
        });
      }
    });
    res.json({
      message: "ยื่นสอบก้าวหน้าสำเร็จ",
      project: updatedProject,
    });
  } catch (error) {
    console.error("Error saving CSB02:", error);
    return res
      .status(500)
      .json({ message: "Server error, please try again later." });
  }
});

app.post("/depart-csb02", async (req, res) => {
  const { projectId, activeStatus } = req.body.params;

  // Validate input
  if (!projectId || activeStatus === undefined) {
    return res
      .status(400)
      .send({ message: "projectId and activeStatus are required." });
  }

  try {
    const updatedProject = await Project.findOneAndUpdate(
      { _id: projectId },
      {
        "status.CSB02.activeStatus": activeStatus,
        "status.CSB02.status": "ผ่าน",
        "status.CSB02.date": new Date(),
      },
      { new: true }
    );

    // Check if the project was found and updated
    if (!updatedProject) {
      return res.status(404).send({ message: "Project not found" });
    }

    // Send a success response
    res.status(200).json({ message: "อัปเดตคะแนนสำเร็จ", updatedProject });
  } catch (error) {
    console.error("Error updating score:", error);
    res
      .status(500)
      .json({ message: "Error updating score", error: error.message });
  }
});

//activecsb03
app.get("/csb03", async (req, res) => {
  let Csb03 = await csb03.find();
  res.json({ body: Csb03 });
});

app.post("/student-csb03", async (req, res) => {
  const { projectId, activeStatus, status, startDate, endDate, organization } =
    req.body.params;

  try {
    // Update the Project
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      {
        "status.CSB03.activeStatus": activeStatus,
        "status.CSB03.status": status || "รอดำเนินการ",
        "status.CSB03.date": new Date(),
      },
      { new: true }
    );

    // Update the CSB03
    const updatedCSB03 = await csb03.findOneAndUpdate(
      { projectId: projectId }, // Use findOneAndUpdate for CSB03 since it uses projectId
      {
        startDate: startDate,
        endDate: endDate,
        organization: organization,
      },
      { new: true, upsert: true } // upsert: true will create a new document if none is found
    );

    if (!updatedProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json({
      message: "ยื่นทดสอบโครงงานสำเร็จ",
      project: updatedProject,
      csb03: updatedCSB03, // Include the updated CSB03 in the response if needed
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error : ยื่นทดสอบโครงงานไม่สำเร็จ" });
  }
});

app.post("/approveCSB03", async (req, res) => {
  const { projectId, activeStatus } = req.body.params;
  try {
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      {
        "status.CSB03.activeStatus": activeStatus,
        "status.CSB03.status": "ผ่านการอนุมัติจากอาจารย์",
        "status.CSB03.date": new Date(),
      },
      { new: true }
    );

    if (!updatedProject) {
      return res.status(404).send({ message: "Project not found" });
    }

    res.status(200).send({
      message: "โครงงานนี้ผ่านการอนุมัติจากอาจารย์แล้ว!",
      data: updatedProject,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Server error, please try again." });
  }
});

app.post("/rejectCSB03", async (req, res) => {
  const { projectId, activeStatus } = req.body.params;

  if (!projectId || activeStatus === undefined) {
    return res
      .status(400)
      .send({ message: "projectId and activeStatus are required." });
  }

  try {
    const updatedProject = await Project.findOneAndUpdate(
      { _id: projectId },
      {
        "status.CSB03.activeStatus": activeStatus,
        "status.CSB03.status": "ไม่ผ่าน",
        "status.CSB03.date": new Date(),
      },
      { new: true }
    );

    if (!updatedProject) {
      return res.status(404).send({ message: "Project not found" });
    }

    res.status(200).send({
      message: "Project rejected successfully!",
      data: updatedProject,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Server error, please try again." });
  }
});

//activecsb04
app.post("/student-csb04", async (req, res) => {
  const { projectId, activeStatus, status } = req.body.params;
  try {
    console.log(
      new Date().toLocaleString("en-TH", { timeZone: "Asia/Bangkok" })
    );

    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      {
        "status.CSB04.activeStatus": activeStatus,
        "status.CSB04.status": status || "รอดำเนินการ",
        "status.CSB04.date": new Date(),
      },
      { new: true }
    );

    if (!updatedProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json({
      message: "ยื่นทดสอบโครงงานสำเร็จ",
      project: updatedProject,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating CSB04" });
  }
});

app.post("/approveCSB04", async (req, res) => {
  const { projectId, activeStatus } = req.body.params;
  try {
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      {
        "status.CSB04.activeStatus": activeStatus,
        "status.CSB04.status": "ผ่านการอนุมัติจากอาจารย์",
        "status.CSB04.date": new Date(),
      },
      { new: true }
    );

    if (!updatedProject) {
      return res.status(404).send({ message: "Project not found" });
    }

    res.status(200).send({
      message: "โครงงานนี้ผ่านการอนุมัติจากอาจารย์แล้ว!",
      data: updatedProject,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Server error, please try again." });
  }
});

app.post("/rejectCSB04", async (req, res) => {
  const { projectId, activeStatus } = req.body.params;

  if (!projectId || activeStatus === undefined) {
    return res
      .status(400)
      .send({ message: "projectId and activeStatus are required." });
  }

  try {
    const updatedProject = await Project.findOneAndUpdate(
      { _id: projectId },
      {
        "status.CSB04.activeStatus": activeStatus,
        "status.CSB04.status": "ไม่ผ่าน",
        "status.CSB04.date": new Date(),
      },
      { new: true }
    );

    if (!updatedProject) {
      return res.status(404).send({ message: "Project not found" });
    }

    res.status(200).send({
      message: "Project rejected successfully!",
      data: updatedProject,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Server error, please try again." });
  }
});

// app.post("/score-csb04", async (req, res) => {
//   const { projectId, unconfirmScore, comment, referee } = req.body.params;

//   try {
//     let existingCsb04 = await csb04.findOne({ projectId });

//     if (existingCsb04) {
//       existingCsb04.unconfirmScore = unconfirmScore;
//       existingCsb04.referee = referee || [];
//       existingCsb04.comment = comment || "";
//       const updatedCsb04 = await existingCsb04.save();

//       res.json({
//         message: "CSB04 score updated successfully",
//         project: {
//           _id: updatedCsb04._id,
//           projectId: updatedCsb04.projectId,
//           unconfirmScore: updatedCsb04.unconfirmScore,
//           comment: updatedCsb04.comment,
//           referee: updatedCsb04.referee,
//         },
//       });
//     } else {
//       const newCsb04 = new csb04({
//         projectId,
//         unconfirmScore,
//         referee,
//         comment,
//       });

//       const savedCsb04 = await newCsb04.save();

//       res.json({
//         message: "CSB04 score saved successfully",
//         project: {
//           _id: savedCsb04._id,
//           projectId: savedCsb04.projectId,
//           unconfirmScore: savedCsb04.unconfirmScore,
//           comment: savedCsb04.comment,
//           referee: savedCsb04.referee,
//         },
//       });
//     }
//   } catch (error) {
//     console.error(error);
//     res
//       .status(500)
//       .json({ message: "Error updating CSB04", error: error.message });
//   }
// });

app.get("/csb04", async (req, res) => {
  let Csb04 = await csb04.find();
  res.json({ body: Csb04 });
});

app.post("/chair-csb04", async (req, res) => {
  const {
    _id,
    // projectId,
    // confirmScore,
    logBookScore,
    exhibitionScore,
    unconfirmScore,
    // grade,
    activeStatus,
  } = req.body.params;

  try {
    // Check if an entry for the project already exists

    const confirmScore =
      parseInt(unconfirmScore) +
      parseInt(logBookScore) +
      parseInt(exhibitionScore); //04เปลี่ยนๆ
    const existingCsb04 = await csb04.findByIdAndUpdate(
      _id,
      {
        $set: {
          activeStatus,
          unconfirmScore: parseInt(unconfirmScore),
          logBookScore: parseInt(logBookScore),
          exhibitionScore: parseInt(exhibitionScore),
          confirmScore,
        },
      },
      { new: true }
    );

    if (!existingCsb04) {
      return res.status(404).json({ message: "CSB04 not found" });
    }

    const isPassed = confirmScore >= 55;

    // Update the project status first
    const updatedProject = await Project.findOneAndUpdate(
      { _id: existingCsb04.projectId },
      {
        "status.CSB04.activeStatus": activeStatus,
        "status.CSB04.status": isPassed ? "ผ่าน" : "ไม่ผ่าน",
        "status.CSB04.score": confirmScore,
        "status.CSB04.date": new Date(),
      },
      { new: true }
    );

    if (!updatedProject) {
      return res.status(404).json({ message: "Project not found." });
    }
    const room = await Room.findOne({
      "projects.projectId": existingCsb04.projectId,
      status: "กำลังดำเนินการ",
    });
    if (!room) {
      return res.status(404).json({ message: "Room not found." });
    }

    await Promise.all(
      room.projects.map(async (project) => {
        const data = await csb04.findOne({ projectId: project.projectId });
        return data?.confirmScore !== 0;
      })
    ).then(async (results) => {
      const allPass = results.every((result) => result === true);
      if (allPass) {
        await Room.findByIdAndUpdate(room._id, {
          status: "ดำเนินการเสร็จสิ้น",
        });
      }
    });

    res.json({
      message: "ยื่นสอบป้องกันสำเร็จ",
      project: updatedProject,
    });
  } catch (error) {
    console.error("Error saving CSB04:", error);
    return res
      .status(500)
      .json({ message: "Server error, please try again later." });
  }
});

app.post("/depart-csb04", async (req, res) => {
  const { projectId, activeStatus } = req.body.params;

  // Validate input
  if (!projectId || activeStatus === undefined) {
    return res
      .status(400)
      .send({ message: "projectId and activeStatus are required." });
  }

  try {
    const updatedProject = await Project.findOneAndUpdate(
      { _id: projectId },
      {
        "status.CSB04.activeStatus": activeStatus,
        "status.CSB04.status": "ผ่าน",
        "status.CSB04.date": new Date(),
      },
      { new: true }
    );

    // Check if the project was found and updated
    if (!updatedProject) {
      return res.status(404).send({ message: "Project not found" });
    }

    // Send a success response
    res
      .status(200)
      .json({ message: "Score updated successfully", updatedProject });
  } catch (error) {
    console.error("Error updating score:", error);
    res
      .status(500)
      .json({ message: "Error updating score", error: error.message });
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

app.get("/sumary-room", async (req, res) => {
  let room = await Room.find();
  res.json({ body: room });
});

app.post(
  "/sumary-room-by-name-exam",
  middlewareExtractJwt,
  async (req, res) => {
    const { examName } = req.body;
    const { username } = req.user;

    if (!examName) {
      return res.status(400).json({ message: "Missing examName" });
    }

    try {
      var resultData = {
        body: [],
      };

      const collectionMapper = {
        สอบหัวข้อ: csb01,
        สอบก้าวหน้า: csb02,
        สอบป้องกัน: csb04,
      };

      const collection = collectionMapper[examName];
      if (!collection) {
        return res.status(400).json({ message: "Invalid exam type" });
      }

      const rooms = await Room.find({ nameExam: examName });
      for (const room of rooms) {
        //find by username but only status is รอดำเนินการ

        const csbData = await collection.find({
          referee: {
            $elemMatch: {
              T_id: username,
              status: "รอดำเนินการ",
            },
          },
        });

        var dataWithProjectName = [];
        for (const data of csbData) {
          const Data = await Project.findById(data.projectId);
          if (
            Data &&
            room.projects &&
            room.projects.some(
              (project) => project.projectId === data.projectId
            ) &&
            room.teachers.some((ref) => ref.T_id === username)
          ) {
            dataWithProjectName.push({
              projectName: Data.projectName,
              ...data._doc,
            });
          }
        }

        const added = false;
        resultData.body = resultData.body.map((result) => {
          if (result.dateExam === room.dateExam) {
            added = true;
            result.projects.push(dataWithProjectName);
          }
          return result;
        });

        if (!added && dataWithProjectName.length > 0) {
          const result = {
            dateExam: room.dateExam,
            projects: dataWithProjectName,
          };
          resultData.body.push(result);
        }
      }

      return res.json(resultData);
    } catch (error) {
      console.error("Error in getting room summary:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

app.get("/room-management", async (req, res) => {
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

app.post("/auth/level", async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ message: "Missing username" });
  }

  try {
    const teacher = await Teacher.findOne({ T_id: username });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const super_role = teacher.T_super_role;
    console.log("Super role:", super_role);

    // find in Room.teacher that have role = main
    const chairMan = await Room.findOne({
      teachers: { $elemMatch: { T_id: username } },
    });

    console.log("Chairman:", chairMan, `Username:${username}:`);

    let level = "teacher";

    if (super_role === "head") {
      level = "head";
    }

    if (chairMan) {
      level = "chairman";
    }

    if (super_role === "head" && chairMan) {
      level = "all";
    }
    console.log("Level:", level);

    return res.json({ level });
  } catch (error) {
    console.error("Error in getting user info:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/auth/login", async (req, res) => {
  const token = req.header("Authorization").split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Missing token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded token:", decoded);

    const role = decoded.role;

    if (
      role !== "student" &&
      role !== "teacher" &&
      role !== "admin" &&
      role !== "superAdmin"
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const newToken = jwt.sign(
      { username: decoded.username, role: decoded.role },
      process.env.JWT_SECRET
    );

    return res.json({
      username: decoded.username,
      role: decoded.role,
      jwtToken: newToken,
    });
  } catch (error) {
    console.error("Error in verifying token:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/auth/login", async (req, res) => {
  let { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Missing credentials" });
  }

  // trim username

  username = username.trim();
  console.log("Username", username, "Password", password);

  try {
    const SuperAdmin = await superAdmin.findOne({
      sA_id: username,
      sA_password: password,
    });
    if (SuperAdmin) {
      const jwtToken = jwt.sign(
        { username, role: "superAdmin" },
        process.env.JWT_SECRET
      );
      console.log("Role:", "superAdmin");
      return res.json({ username, role: "superAdmin", jwtToken });
    }

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
    console.log("Response:", response.data);

    if (response.data.api_status == "success") {
      const role = response.data.userInfo.account_type;
      if (role === "students") {
        //find student by username in student if not exist create one

        const student = await Students.findOne({ S_id: username });

        if (!student) {
          const newStudent = new Students({
            S_id: username,
            S_name: response.data.userInfo.displayname,
            S_email: response.data.userInfo.email,
            S_pid: response.data.userInfo.pid,
            S_account_type: response.data.userInfo.account_type,
          });

          await newStudent.save();
        }
        const jwtToken = jwt.sign(
          { username: response.data.userInfo.username, role: "student" },
          process.env.JWT_SECRET
        );
        return res.json({
          username: response.data.userInfo.username,
          role: "student",
          jwtToken,
        });
      }

      if (role === "personel") {
        const userInWhiteList = await whitelist.findOne({
          username: response.data.userInfo.username,
        });

        if (!userInWhiteList) {
          return res.status(403).json({ message: "User not in whitelist" });
        }

        const { role } = userInWhiteList;

        if (role === "admin") {
          //find admin by username in student if not exist create one

          const admin = await Admin.findOne({ A_id: username });

          if (!admin) {
            const newAdmin = new Admin({
              A_id: username,
              A_name: response.data.userInfo.displayname,
              A_email: response.data.userInfo.email,
              A_pid: response.data.userInfo.pid,
              A_account_type: response.data.userInfo.account_type,
            });
            await newAdmin.save();
          }

          const jwtToken = jwt.sign(
            { username, role: "admin" },
            process.env.JWT_SECRET
          );
          console.log("Role:", "admin");

          return res.json({ username, role: "admin", jwtToken });
        }

        const teacher = await Teacher.findOne({ T_id: username });
        if (!teacher) {
          const newTeacher = new Teacher({
            T_id: username,
            T_name: response.data.userInfo.displayname,
            T_email: response.data.userInfo.email,
            T_pid: response.data.userInfo.pid,
            T_account_type: response.data.userInfo.account_type,
            T_super_role: "teacher",
          });
          await newTeacher.save();
        }
        const jwtToken = jwt.sign(
          { username, role: "teacher" },
          process.env.JWT_SECRET
        );
        console.log("Role:", "teacher");

        return res.json({ username, role: "teacher", jwtToken });
      }
      console.log("Role:", "unknown");

      return res.status(403).json({ message: "Forbidden" });
    }

    return res.status(401).json({ message: "Unauthorized" });
  } catch (error) {
    console.error("Error in login:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// app.post('/assignteacher', async(req, res) => {
//   const project = await Project.findOne({ projectId: req.body.projectId });
//   const teacher = await Teacher.find({ T_id: { $in: req.body.T_id } });

//   if (!project) {
//     return res.status(404).json({ message: "Project not found" });
//   }

//   if (!teacher) {
//     return res.status(404).json({ message: "Teacher not found" });
//   }

//   try{
//     await Project.findByIdAndUpdate(project._id, { lecturer: teacher });
//     res.json({ body: project });
//   } catch (error) {
//     console.error("Error assigning teacher:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// })

app.post("/assignteacher", async (req, res) => {
  console.log("Received request:", req.body.params);
  const { projectId, T_name } = req.body.params; // Here, T_name contains the teacher IDs

  // Ensure projectId and T_name are present
  if (!projectId || !T_name || T_name.length === 0) {
    return res.status(400).json({
      message: "Invalid request: Project ID and Teacher IDs are required.",
    });
  }

  const project = await Project.findById(projectId);
  console.log("Project found:", project); // Use findById for a direct lookup
  const teachers = await Teacher.find({ T_id: { $in: T_name } }); // Match by T_id

  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  if (!teachers || teachers.length === 0) {
    return res.status(404).json({ message: "Teacher not found" });
  }
  console.log("Teachers found:", teachers);

  try {
    // Update the project with the found teachers
    project.lecturer = teachers; // Assign the lecturers directly
    await project.save(); // Save the updated project
    res.status(200).json({ message: "Lecturer(s) assigned successfully!" }); // Return success message
  } catch (error) {
    console.error("Error assigning teacher:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

//ocr
const upload = multer();

app.post("/files", upload.any("transcriptFile"), async (req, res) => {
  try {
    let studentId = req.body.std; // Use let instead of const
    const directoryPath = `./ocr/upload/${studentId}`;

    // Check and create directory if it doesn't exist
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

    // Find and update the file in MongoDB
    let document = await file.findOne({ fi_id: studentId });

    if (!document) {
      newOcr = new file({
        fi_id: studentId,
        fi_file: path.join(
          directoryPath,
          req.files.find((file) => file.fieldname === "transcriptFile")
            .originalname
        ),
        fi_english_test: path.join(
          directoryPath,
          req.files.find((file) => file.fieldname === "englishScoreFile")
            .originalname
        ),
        fi_result: {
          project_1: {
            status: "ยังไม่ได้ตรวจสอบ",
          },
        },
      });
      let savedOcr = await newOcr.save();
      if (!savedOcr) {
        return res.status(500).json({ message: "Error saving file." });
      }
      console.log("New OCR created:", savedOcr);
    } else if (document.fi_result.project_1.status !== "ผ่าน") {
      await file.findOneAndUpdate(
        {
          fi_id: studentId,
        },
        {
          fi_file: path.join(
            directoryPath,
            req.files.find((file) => file.fieldname === "transcriptFile")
              .originalname
          ),
          fi_english_test: path.join(
            directoryPath,
            req.files.find((file) => file.fieldname === "englishScoreFile")
              .originalname
          ),
          fi_result: {
            project_1: {
              status: "ยังไม่ได้ตรวจสอบ",
            },
          },
        }
      );
    } else {
      const updatedOcr = await file.findOneAndUpdate(
        { fi_id: studentId },
        {
          fi_file: path.join(
            directoryPath,
            req.files.find((file) => file.fieldname === "transcriptFile")
              .originalname
          ),
          "fi_result.project_2.status": "ยังไม่ได้ตรวจสอบ",
        },
        { new: true }
      );
      const updated = await updatedOcr.save();
      console.log("New OCR updated:", updated);
    }

    // Execute Python script to check files
    console.log("Student:", studentId);

    exec(`python ./ocr/ocr.py ${studentId}`, async (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing Python script: ${error.message}`);
        return res.status(500).json({ message: "Error checking file." });
      }
      console.log(`Python script output: ${stdout}`);

      return res.status(200).json({ message: "Files uploaded" });
    });
  } catch (error) {
    console.error("Error in file upload process:", error);
    return res
      .status(500)
      .json({ message: "Server error during file upload." });
  }
});

// app.patch("/files/:fi_id", async (req, res) => {
//   const { fi_id,fi_status } = req.body.params;

//   try {
//     const result = await file.findOneAndUpdate({ fi_id,fi_status }, { new: true });

//     if (!result) {
//       return res.status(404).json({ message: "File not found." });
//     }

//     res
//       .status(200)
//       .json({ message: "File status updated successfully.", result });
//   } catch (error) {
//     console.error("Error updating file status:", error);
//     res.status(500).json({ message: "Error updating file status." });
//   }
// });

app.patch("/files", async (req, res) => {
  const { status, _id, projectState, comment } = req.body.params;

  if (!status || !_id) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  if (projectState !== "project_1" && projectState !== "project_2") {
    return res.status(400).json({ message: "Invalid project state." });
  }

  try {
    const result = await file.findByIdAndUpdate(
      _id,
      {
        [`fi_result.${projectState}.status`]: status,
        [`fi_result.${projectState}.comment`]: comment,
        [`fi_result.${projectState}.checkDate`]: new Date(),
      },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ message: "File not found." });
    }

    res
      .status(200)
      .json({ message: "File status updated successfully.", result });
  } catch (error) {
    console.error("Error updating file status:", error);
    res.status(500).json({ message: "Error updating file status." });
  }
});

// app.patch("/files/:fi_id", async (req, res) => {
//   const { fi_id } = req.params;
//   const { fi_status } = req.body; // Extracting fi_status from the request body

//   try {
//     const result = await file.findOneAndUpdate(
//       { fi_id },
//       { fi_status },
//       { new: true }
//     );

//     if (!result) {
//       return res.status(404).json({ message: "File not found." });
//     }

//     res
//       .status(200)
//       .json({ message: "File status updated successfully.", result });
//   } catch (error) {
//     console.error("Error updating file status:", error);
//     res.status(500).json({ message: "Error updating file status." });
//   }
// });

app.get(
  "/files",
  middlewareExtractJwt,
  verifyRoleSuperAdminAndAdmin,
  async (req, res) => {
    try {
      const files = await file.find({
        $or: [
          { "fi_result.project_1.status": "ยังไม่ได้ตรวจสอบ" },
          { "fi_result.project_2.status": "ยังไม่ได้ตรวจสอบ" },
        ],
      });

      // Manually find and add the corresponding student name
      const modifiedFiles = await Promise.all(
        files.map(async (file) => {
          const studentId = `s${file.fi_id}`; // Add the 's' prefix to match the S_id format
          const student = await Students.findOne({ S_id: studentId });

          // Transform the fi_file field
          let listFile = [];
          let segmentsTranscriptFile = file.fi_file.split("\\");
          let fileNameTranscriptFile =
            segmentsTranscriptFile[segmentsTranscriptFile.length - 1];
          let linkFileTranscriptFile =
            segmentsTranscriptFile[segmentsTranscriptFile.length - 2] +
            "/" +
            fileNameTranscriptFile;
          const transcriptFile = {
            linkFile: linkFileTranscriptFile,
            fileName: fileNameTranscriptFile,
          };
          listFile.push(transcriptFile);

          let segmentsEnglishScoreFile = file.fi_english_test.split("\\");
          let fileNameEnglishScoreFile =
            segmentsEnglishScoreFile[segmentsEnglishScoreFile.length - 1];
          let linkFileEnglishScoreFile =
            segmentsEnglishScoreFile[segmentsEnglishScoreFile.length - 2] +
            "/" +
            fileNameEnglishScoreFile;
          const englishScoreFile = {
            linkFile: linkFileEnglishScoreFile,
            fileName: fileNameEnglishScoreFile,
          };
          listFile.push(englishScoreFile);

          // Return the modified file document
          return {
            ...file._doc, // Spread the original file document properties
            fi_file: listFile,
            studentName: student ? student.S_name : null, // Add the student name if found
          };
        })
      );

      // Send the modified response
      res.json({ body: modifiedFiles });
    } catch (error) {
      console.error("Error fetching files:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

app.get("/filesbytoken", middlewareExtractJwt, async (req, res) => {
  const { username } = req.user;
  const fi_id = username.replace("s", "");

  try {
    const fileData = await file.findOne({ fi_id });

    if (!fileData) {
      return res.status(404).json({ message: "File not found" });
    }

    res.json({ body: fileData });
  } catch (error) {
    console.error("Error fetching file:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/view/:filepath/:filename", (req, res) => {
  // Get the file path from the request parameters
  const { filepath, filename } = req.params;

  // Construct the absolute path to the PDF file
  const pdfPath = path.join(__dirname, "ocr/upload", filepath, filename);

  // Send the PDF file to the client
  res.sendFile(pdfPath, (err) => {
    if (err) {
      console.error("Error sending the file:", err);
      res.status(404).send("PDF file not found");
    }
  });
});

// Endpoint to get project details by projectId
app.get("/projects/:projectId", async (req, res) => {
  const { projectId } = req.params; // Get the projectId from the URL parameters
  console.log("Fetching project details for ID:", projectId);

  try {
    // Find the project by ID
    const project = await Project.findById(projectId);
    console.log("Project found:", project);

    // If the project is not found, return a 404 response
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Return the project data including students and lecturers
    res.json({ body: project });
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ message: "Error fetching project data" });
  }
});

app.post("/get-chairman-project", middlewareExtractJwt, async (req, res) => {
  const { username } = req.user;
  const { nameExam } = req.body;

  try {
    if (nameExam === "สอบหัวข้อ") {
      let result = [];
      let csb01Record = await csb01.find({
        referee: {
          $elemMatch: {
            T_id: username,
            role: "main",
          },
        },
        confirmScore: 0,
      });

      // Check if a record was found
      if (!csb01Record) {
        return res
          .status(404)
          .json({ message: "User does not have the role of 'main' in csb01" });
      }

      for (const data of csb01Record) {
        const allNotWaiting = data.referee.every(
          (ref) => ref.status !== "รอดำเนินการ"
        );
        const project = await Project.findById(data.projectId);
        if (allNotWaiting) {
          result.push({
            ...data._doc,
            projectName: project.projectName,
            student: project.student,
            lecturer: project.lecturer,
          });
        }
      }

      res.json({ data: result });
    } else if (nameExam === "สอบก้าวหน้า") {
      let result = [];
      let csb02Record = await csb02.find({
        referee: {
          $elemMatch: {
            T_id: username,
            role: "main",
          },
        },
        confirmScore: 0,
      });
      console.log("CSB02 Record:", csb02Record);

      // Check if a record was found
      if (!csb02Record) {
        return res
          .status(404)
          .json({ message: "User does not have the role of 'main' in csb02" });
      }

      for (const data of csb02Record) {
        const allNotWaiting = data.referee.every(
          (ref) => ref.status !== "รอดำเนินการ"
        );
        const project = await Project.findById(data.projectId);
        if (allNotWaiting) {
          result.push({
            ...data._doc,
            projectName: project.projectName,
            student: project.student,
            lecturer: project.lecturer,
          });
        }
      }

      res.json({ data: result });
    } else if (nameExam === "สอบป้องกัน") {
      let result = [];
      let csb04Record = await csb04.find({
        referee: {
          $elemMatch: {
            T_id: username,
            role: "main",
          },
        },
        confirmScore: 0,
      });

      // Check if a record was found
      if (!csb04Record) {
        return res
          .status(404)
          .json({ message: "User does not have the role of 'main' in csb03" });
      }
      for (const data of csb04Record) {
        const allNotWaiting = data.referee.every(
          (ref) => ref.status !== "รอดำเนินการ"
        );
        const project = await Project.findById(data.projectId);
        if (allNotWaiting) {
          result.push({
            ...data._doc,
            projectName: project.projectName,
            student: project.student,
            lecturer: project.lecturer,
          });
        }
      }

      res.json({ data: result });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching project data" });
  }
});

app.post(
  "/whitelist",
  middlewareExtractJwt,
  verifyRoleSuperAdminAndAdmin,
  async (req, res) => {
    const { username, role } = req.body;
    const trimmedUsername = username.trim();
    console.log("Username:", trimmedUsername, "Role:", role);
    try {
      const user = new whitelist({
        username: trimmedUsername,
        role,
      });

      await user.save();
      res.json({ message: "User added to whitelist", data: user });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

app.delete(
  "/whitelist",
  middlewareExtractJwt,
  verifyRoleSuperAdminAndAdmin,
  async (req, res) => {
    const { username, role } = req.body;

    try {
      const user = await whitelist.findOneAndDelete({ username, role });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.json({ message: "User removed from whitelist" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
);
app.get(
  "/whitelist",
  middlewareExtractJwt,
  verifyRoleSuperAdminAndAdmin,
  async (req, res) => {
    try {
      const users = await whitelist.find();

      return res.json({ data: users });
    } catch (error) {
      console.error("error", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

app.post("/project-acceptance", middlewareExtractJwt, async (req, res) => {
  const { examName } = req.body;
  const { username } = req.user;
  try {
    const project = await Project.find({
      "lecturer.T_id": username,
      [`status.${examName}.activeStatus`]: 1,
    })
      .populate("student")
      .populate("lecturer");

    res.json({ body: project });
  } catch (error) {
    console.error("Error fetching project data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/exam-period", async (req, res) => {
  try {
    const examPeriod = await ExamPeriod.find();

    if (examPeriod.length === 0) {
      return res.status(404).json({ message: "No exam periods found." });
    }

    res.status(200).json({ body: examPeriod });
  } catch (error) {
    console.error("Error fetching exam periods:", error);
    res.status(500).json({ message: "Failed to fetch exam periods." });
  }
});

app.get("/access", middlewareExtractJwt, async (req, res) => {
  try {
    const { username } = req.user;

    const examPeriod = await ExamPeriod.find();
    const userWithOutS = username.replace("s", "");

    const projects = await Project.findOne({
      "student.studentId": userWithOutS,
    });
    const files = await file.findOne({
      fi_id: userWithOutS,
    });

    if (examPeriod.length === 0) {
      return res.status(404).json({ message: "No exam periods found." });
    }

    let result = examPeriod.filter((exam) => {
      const { examName } = exam;
      console.log("files != null", files != null);
      console.log("files:", files);
      console.log(
        "filefiles.fi_result.project_1.statuss:",
        files?.fi_result.project_1.status
      );
      console.log("projects:", projects);
      console.log("exam.examStatus:", exam.examStatus);

      if (examName === "สอบหัวข้อ") {
        return (
          files != null &&
          files?.fi_result.project_1.status == "ผ่าน" &&
          projects == null &&
          exam.examStatus
        );
      } else if (examName === "สอบก้าวหน้า") {
        return (
          projects?.status.CSB01.activeStatus == 2 &&
          projects?.status.CSB02.activeStatus == 0 &&
          exam.examStatus
        );
      } else if (examName === "ยื่นทดสอบโครงงาน") {
        return (
          projects?.status.CSB02.activeStatus == 3 &&
          files?.fi_result.project_2.status == "ผ่าน" &&
          projects?.status.CSB03.activeStatus != 2 &&
          exam.examStatus
        );
      } else if (examName === "สอบป้องกัน") {
        return (
          projects &&
          projects?.status.CSB03.activeStatus == 2 &&
          projects?.status.CSB04.activeStatus == 0 &&
          exam.examStatus
        );
      }
    });
    console.log(
      files == null,
      files && files.fi_result.project_1.status !== "ผ่าน"
    );
    console.log(
      "files?.fi_result.project_1.status",
      files?.fi_result.project_1.status
    );
    console.log("files == null", files == null);

    result = [
      ...result,
      {
        examName: "ตรวจสอบคุณสมบัติการยื่นสอบโครงงานพิเศษ 1",
        examStatus:
          files == null || files?.fi_result.project_1.status !== "ผ่าน",
      },
      {
        examName: "ตรวจสอบคุณสมบัติการยื่นสอบโครงงานพิเศษ 2",
        examStatus:
          projects != null &&
          projects.status.CSB02.activeStatus == 3 &&
          files != null &&
          files.fi_result.project_2.status !== "ผ่าน",
      },
    ];

    res.status(200).json({ body: result });
  } catch (error) {
    console.error("Error fetching exam periods:", error);
    res.status(500).json({ message: "Failed to fetch exam periods." });
  }
});

app.patch("/exam-period", async (req, res) => {
  const { examPeriodId, examPeriodStatus } = req.body;

  if (!examPeriodId || examPeriodStatus === undefined) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    const result = await ExamPeriod.findByIdAndUpdate(
      examPeriodId,
      { examStatus: examPeriodStatus },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ message: "หาช่วงสอบไม่พบ" });
    }

    res.status(200).json({
      message: `อัพเดทสถานะช่วงสอบ ${result.examName} สำเร็จ`,
      result,
    });
  } catch (error) {
    res.status(500).json({ message: "อัพเดทสถานะช่วงสอบไม่สำเร็จ" });
  }
});

app.get("/exam/:examName", async (req, res) => {
  const { examName } = req.params;

  try {
    // const
    const decodedExamName = decodeURIComponent(examName);
    console.log("Decoded exam name:", decodedExamName);

    const examNameMapper = {
      สอบหัวข้อ: "CSB01",
      สอบก้าวหน้า: "CSB02",
      สอบป้องกัน: "CSB04",
    };

    const activeStatusMapper = {
      สอบหัวข้อ: 1,
      สอบก้าวหน้า: 2,
      สอบป้องกัน: 2,
    };

    var allProjects = [];
    console.log(
      `status.${examNameMapper[decodedExamName]}.activeStatus`,
      "Active status:",
      activeStatusMapper[decodedExamName]
    );

    const projects = await Project.find({
      [`status.${examNameMapper[decodedExamName]}.activeStatus`]:
        activeStatusMapper[decodedExamName],
    });
    console.log(projects);

    for (const project of projects) {
      const room = await Room.find({
        projects: {
          $elemMatch: {
            projectName: project.projectName,
          },
        },
        status: "กำลังดำเนินการ",
      });

      if (room.length === 0) {
        allProjects.push(project);
      }
    }

    return res.status(200).json({ body: allProjects });
  } catch (error) {
    console.error("Error fetching exam periods:", error);
    return res.status(500).json({ message: "Failed to fetch exam." });
  }
});

//ตรวจสอบสถานะโครงงาน
app.get("/project/status", middlewareExtractJwt, async (req, res) => {
  const { username } = req.user;
  try {
    console.log("Username:", username.replace("s", ""));

    const project = await Project.findOne({
      "student.studentId": username.replace("s", ""),
    });
    const files = await file.findOne({
      fi_id: username.replace("s", ""),
    });
    console.log("Project:", project);

    const csb01ResultMapper = ["รอดำเนินการ", "รอดำเนินการ", "ผ่าน"];
    const csb02ResultMapper = [
      "รอดำเนินการ",
      "รอดำเนินการ",
      "ผ่านการอนุมัติจากอาจารย์",
      "ผ่าน",
    ];
    const csb03ResultMapper = ["รอดำเนินการ", "รอดำเนินการ", "ผ่าน"];
    const csb04ResultMapper = [
      "รอดำเนินการ",
      "รอดำเนินการ",
      "ผ่านการอนุมัติจากอาจารย์",
      "ผ่าน",
    ];
    const allProjectStatus = [
      {
        id: 1,
        name: "สอบหัวข้อ",
        status: project ? project.status.CSB01.status : "ยังไม่ได้สร้างโครงงาน",
      },
      {
        id: 2,
        name: "สอบก้าวหน้า",
        status: project ? project.status.CSB02.status : "ยังไม่ได้สร้างโครงงาน",
      },
      {
        id: 3,
        name: "ยื่นทดสอบโครงงาน",
        status: project ? project.status.CSB03.status : "ยังไม่ได้สร้างโครงงาน",
      },
      {
        id: 4,
        name: "สอบป้องกัน",
        status: project ? project.status.CSB04.status : "ยังไม่ได้สร้างโครงงาน",
      },
      {
        id: 5,
        name: "ตรวจสอบคุณสมบัติการยื่นสอบโครงงานพิเศษ 1",
        status: files ? files.fi_result.project_1.status : "ยังไม่ได้ตรวจสอบ",
        remark: files ? files.fi_result.project_1.comment : "",
      },
      {
        id: 6,
        name: "ตรวจสอบคุณสมบัติการยื่นสอบโครงงานพิเศษ 2",
        status: files ? files.fi_result.project_2.status : "ยังไม่ได้ตรวจสอบ",
        remark: files ? files.fi_result.project_2.comment : "",
      },
    ];
    return res.json({ body: allProjectStatus });
  } catch (error) {
    console.error("Error fetching all project data:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = app;
