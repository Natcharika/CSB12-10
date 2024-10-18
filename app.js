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
const path = require("path");

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
const csb01 = require("./model/csb01.model");
const csb02 = require("./model/csb02.model");
const csb03 = require("./model/csb03.model");
const csb04 = require("./model/csb04.model");
const anouncement = require("./model/anouncement.model");

// const adminUser = ["kriangkraia", "chantimap"];
const adminUser = ["nateep", "alisah", "kriangkraia", "chantimap"];
// const adminUser = ["admin1", "admin2", "admin3", "admin4"];

const middlewareExtractJwt = (req, res, next) => {
  const token = req.header("Authorization").split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Auth Error" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    console.log("decoded22", decoded);

    next();
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Invalid Token" });
  }
};

const app = express();
app.use(cors());

app.use(bodyParser.json({ limit: "5mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "5mb" }));

app.use(express.json());

app.get("/", async (req, res) => {
  let score = await Score.find();
  res.json({ body: "hello TNP" });
});

app.post("/create-form", async (req, res) => {
  try {
    const {
      projectName,
      projectType,
      projectStatus,
      projectDescription,
      student,
    } = req.body.data; // Accessing properties inside 'data'

    // Validate required fields
    if (
      projectName === undefined ||
      projectType === undefined ||
      projectStatus === undefined
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    console.log("Received body:", req.body); // Log the entire bodys
    // Create a new project
    const projects = new Project({
      projectName,
      projectType,
      projectStatus,
      projectDescription,
      student,
    });

    const savedData = await projects.save();
    console.log("Saved project:", savedData); // Log the saved project

    // await Project.findByIdAndUpdate(projects._id);

    res.json({ body: { project: savedData } });
  } catch (error) {
    console.error("Error creating project and score:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Updated route to reflect changes

// app.post("/create-room-management", async (req, res) => {
//   try {
//     const { roomExam, nameExam, dateExam, teachers, projects } = req.body; // Updated referees to teachers
//     if (!teachers || !Array.isArray(teachers)) {
//       return res
//         .status(400)
//         .json({ error: "Teachers must be a defined array" });
//     }
//     // Check if the room is already booked for the given date
//     const existingRoom = await Room.findOne({
//       roomExam: roomExam,
//       dateExam: dateExam,
//       "projects.start_in_time": { $in: projects.map((p) => p.start_in_time) },
//     });
//     if (existingRoom) {
//       return res.status(400).json({
//         error:
//           "ห้องสอบนี้ได้ถูกจัดไว้แล้วในวันที่เลือก กรุณาเลือกวันอื่นหรือห้องสอบอื่น",
//       });
//     }

//     await Room.create({
//       roomExam,
//       nameExam: nameExam,
//       dateExam,
//       teachers: teachers, // Updated referees to teachers
//       projects,
//     });

//     for (const project of projects) {
//       const { projectId } = project;
//       var exam;
//       if (nameExam == "สอบหัวข้อ") {
//         exam = new csb01({
//           projectId,
//           confirmScore: 0,
//           unconfirmScore: 0,
//           referee: teachers.map(({ T_id, T_name, role }) => ({
//             T_id,
//             T_name,
//             role,
//             score: 0,
//             comment: "",
//             status: "waiting",
//           })),
//         });
//       } else if (nameExam == "สอบก้าวหน้า") {
//         exam = new csb02({
//           projectId,
//           confirmScore: 0,
//           unconfirmScore: 0,
//           logBookScore: 0,
//           referee: teachers.map(({ T_id, T_name, role }) => ({
//             T_id,
//             T_name,
//             role,
//             score: 0,
//             comment: "",
//             status: "waiting",
//           })),
//         });
//       } else if (nameExam == "สอบป้องกัน") {
//         exam = new csb03({
//           projectId,
//           confirmScore: 0,
//           unconfirmScore: 0,
//           exhibitionScore: 0,
//           referee: teachers.map(({ T_id, T_name, role }) => ({
//             T_id,
//             T_name,
//             role,
//             score: 0,
//             comment: "",
//             status: "waiting",
//           })),
//         });
//       }
//       console.log("project ", projectId, " exam ", exam);

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

//ของเก่าห้ามลบ

app.post("/create-room-management", async (req, res) => {
  try {
    const { projectId, roomExam, nameExam, dateExam, teachers, projects } =
      req.body;
    if (!teachers || !Array.isArray(teachers)) {
      return res
        .status(400)
        .json({ error: "Teachers must be a defined array" });
    }

    // Check if the room is already booked for the given date
    // const existingRoom = await Room.findOne({
    //   roomExam: roomExam,
    //   dateExam: dateExam,
    //   "projects.start_in_time": { $in: projects.map((p) => p.start_in_time) },
    // });

    // if (existingRoom) {
    //   return res.status(400).json({
    //     error:
    //       "ห้องสอบนี้ได้ถูกจัดไว้แล้วในวันที่เลือก กรุณาเลือกวันอื่นหรือห้องสอบอื่น",
    //   });
    // }

    // Create Room Management Entry
    await Room.create({
      roomExam,
      nameExam,
      dateExam,
      teachers,
      projects,
    });

    // Create exams for each project
    for (const project of projects) {
      const { projectId } = project;
      let exam;
      console.log(nameExam);

      switch (nameExam) {
        case "สอบหัวข้อ":
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
              status: "waiting",
            })),
          });
          break;

        case "สอบก้าวหน้า":
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
              status: "waiting",
            })),
          });
          break;

        case "สอบป้องกัน":
          exam = new csb03({
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
              status: "waiting",
            })),
          });
          break;

        default:
          return res.status(400).json({ error: "Invalid exam type" });
      }

      // Save each exam instance
      const result = await exam.save();
      if (!result) {
        return res.status(400).json({ error: "Error creating exam" });
      }
    }

    res.json({ message: "Room management and score updated successfully!" });
  } catch (error) {
    console.error("Error in creating room management:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

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
        "status.CSB01.status": status || "waiting",
        "status.CSB01.date": new Date(),
      },
      { new: true }
    );

    if (!updatedProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json({
      message: "CSB01 updated successfully",
      project: updatedProject,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating CSB01" });
  }
});

// app.post("/approveCSB01", async (req, res) => {
//   const { projectId, activeStatus } = req.body.params;
//   try {
//     const updatedProject = await Project.findOneAndUpdate(
//         projectId ,
//       {
//         "status.CSB01.activeStatus": activeStatus,
//         "status.CSB01.status": "approved",
//         "status.CSB01.date": new Date(),
//       },
//       { new: true }
//     );

//     if (!updatedProject) {
//       return res.status(404).send({ message: "Project not found" });
//     }

//     res.status(200).send({ message: "Project approved successfully!", data: updatedProject });
//   } catch (error) {
//     console.error(error);
//     res.status(500).send({ message: "Server error, please try again." });
//   }
// });

app.post("/approveCSB01", async (req, res) => {
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
        "status.CSB01.activeStatus": activeStatus,
        "status.CSB01.status": "approved",
        "status.CSB01.date": new Date(),
      },
      { new: true }
    );

    if (!updatedProject) {
      return res.status(404).send({ message: "Project not found" });
    }

    res.status(200).send({
      message: "Project approved successfully!",
      data: updatedProject,
    });
  } catch (error) {
    console.error("Error approving project:", error); // More specific error logging
    res.status(500).send({
      message: "Server error, please try again.",
      error: error.message,
    });
  }
});

app.post("/rejectCSB01", async (req, res) => {
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
        "status.CSB01.activeStatus": activeStatus,
        "status.CSB01.status": "failed",
        "status.CSB01.date": new Date(),
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
        message: "CSB01 score updated successfully",
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
        message: "CSB01 score saved successfully",
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
    res
      .status(500)
      .json({ message: "Error updating CSB01", error: error.message });
  }
});

//chaircsb01
app.get("/csb01", async (req, res) => {
  let Csb01 = await csb01.find();
  res.json({ body: Csb01 });
});

app.post("/chair-csb01", async (req, res) => {
  const { _id, unconfirmScore, confirmScore } = req.body.params;
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

    const updatedProject = await Project.findOneAndUpdate(
      { _id: existingCsb01.projectId },
      {
        "status.CSB01.activeStatus": activeStatus,
        "status.CSB01.status": isPassed ? "passed" : "failed",
        "status.CSB01.score": confirmScore,
        "status.CSB01.date": new Date(),
      },
      { new: true }
    );

    if (!updatedProject) {
      return res.status(404).json({ message: "Project not found." });
    }
    res.json({
      message: "CSB01 updated successfully",
      project: updatedProject,
    });

    // if (existingCsb01) {
    //   // Update existing entry
    //   existingCsb01.confirmScore = confirmScore;
    //   existingCsb01.logBookScore = logBookScore;
    //   await existingCsb01.save();
    //   return res.json({
    //     message: "CSB01 updated successfully!",
    //     data: existingCsb01,
    //   });
    // } else {
    //   // Create a new entry
    //   const newCsb01 = new csb01({ projectId, confirmScore, logBookScore });
    //   await newCsb01.save();
    //   return res.json({
    //     message: "CSB01 created successfully!",
    //     data: newCsb01,
    //   });
    // }
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
        "status.CSB01.status": "passed",
        "status.CSB01.date": new Date(),
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
        "status.CSB02.status": status || "waiting",
        "status.CSB02.date": new Date(),
      },
      { new: true }
    );

    if (!updatedProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json({
      message: "CSB02 updated successfully",
      project: updatedProject,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating CSB02" });
  }
});

// app.post("/approveCSB02", async (req, res) => {
//   const { projectId, activeStatus } = req.body.params;
//   try {
//     const updatedProject = await Project.findOneAndUpdate(
//         projectId ,
//       {
//         "status.CSB02.activeStatus": activeStatus,
//         "status.CSB02.status": "approved",
//         "status.CSB02.date": new Date(),
//       },
//       { new: true }
//     );

//     if (!updatedProject) {
//       return res.status(404).send({ message: "Project not found" });
//     }

//     res.status(200).send({ message: "Project approved successfully!", data: updatedProject });
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
        "status.CSB02.status": "approved",
        "status.CSB02.date": new Date(),
      },
      { new: true }
    );

    if (!updatedProject) {
      return res.status(404).send({ message: "Project not found" });
    }

    res.status(200).send({
      message: "Project approved successfully!",
      data: updatedProject,
    });
  } catch (error) {
    console.error("Error approving project:", error); // More specific error logging
    res.status(500).send({
      message: "Server error, please try again.",
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
        "status.CSB02.status": "failed",
        "status.CSB02.date": new Date(),
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

app.post("/score-csb", middlewareExtractJwt, async (req, res) => {
  const { _id, score, comment, nameExam } = req.body.params;
  const { username } = req.user;

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
            "referee.$.status": "approved", // Update status for the matching referee
          },
        },
        { new: true } // Return the updated document
      );

      if (!existingCsb01) {
        return res.status(404).json({ message: "CSB01 not found" });
      }

      // Check if all referees have a status other than "waiting"
      const allNotWaiting = existingCsb01.referee.every(
        (ref) => ref.status !== "waiting"
      );

      const approvedReferees = existingCsb01.referee.filter(
        (ref) => ref.status === "approved"
      );

      let unconfirmScore = 0;
      if (approvedReferees.length > 0 && allNotWaiting) {
        // Calculate unconfirmScore by summing the scores of approved referees and dividing by their count
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
        message: "CSB01 score updated successfully",
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
            "referee.$.status": "approved", // Update status for the matching referee
          },
        },
        { new: true } // Return the updated document
      );

      if (!existingCsb02) {
        return res.status(404).json({ message: "CSB02 not found" });
      }

      const allNotWaiting = existingCsb02.referee.every(
        (ref) => ref.status !== "waiting"
      );

      const approvedReferees = existingCsb02.referee.filter(
        (ref) => ref.status === "approved"
      );

      let unconfirmScore = 0;
      if (approvedReferees.length > 0 && allNotWaiting) {
        // Calculate unconfirmScore by summing the scores of approved referees and dividing by their count
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
        message: "CSB02 score updated successfully",
        project: existingCsb02,
        unconfirmScore,
      });
    }

    if (nameExam == "สอบป้องกัน") {
      let existingCsb03 = await csb03.findOneAndUpdate(
        {
          _id: _id, // The document ID to match
          "referee.T_id": username, // Find the specific referee with the matching T_id
        },
        {
          $set: {
            "referee.$.score": score, // Update the score for the matching referee
            "referee.$.comment": comment, // Update comment for the matching referee
            "referee.$.status": "approved", // Update status for the matching referee
          },
        },
        { new: true } // Return the updated document
      );

      if (!existingCsb03) {
        return res.status(404).json({ message: "CSB03 not found" });
      }

      const allNotWaiting = existingCsb03.referee.every(
        (ref) => ref.status !== "waiting"
      );

      const approvedReferees = existingCsb03.referee.filter(
        (ref) => ref.status === "approved"
      );

      let unconfirmScore = 0;
      if (approvedReferees.length > 0 && allNotWaiting) {
        // Calculate unconfirmScore by summing the scores of approved referees and dividing by their count
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
        message: "CSB03 score updated successfully",
        project: existingCsb03,
        unconfirmScore,
      });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error updating CSB02", error: error.message });
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
        "status.CSB02.status": isPassed ? "passed" : "failed",
        "status.CSB02.score": confirmScore,
        "status.CSB02.date": new Date(),
      },
      { new: true }
    );

    if (!updatedProject) {
      return res.status(404).json({ message: "Project not found." });
    }

    res.json({
      message: "CSB02 updated successfully",
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
        "status.CSB02.status": "passed",
        "status.CSB02.date": new Date(),
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
        "status.CSB03.status": status || "waiting",
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
      message: "CSB03 updated successfully",
      project: updatedProject,
      csb03: updatedCSB03, // Include the updated CSB03 in the response if needed
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating CSB03" });
  }
});

app.post("/approveCSB03", async (req, res) => {
  const { projectId, activeStatus } = req.body.params;
  try {
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      {
        "status.CSB03.activeStatus": activeStatus,
        "status.CSB03.status": "approved",
        "status.CSB03.date": new Date(),
      },
      { new: true }
    );

    if (!updatedProject) {
      return res.status(404).send({ message: "Project not found" });
    }

    res.status(200).send({
      message: "Project approved successfully!",
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
        "status.CSB03.status": "failed",
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
        "status.CSB04.status": status || "waiting",
        "status.CSB04.date": new Date(),
      },
      { new: true }
    );

    if (!updatedProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json({
      message: "CSB03 updated successfully",
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
        "status.CSB04.status": "approved",
        "status.CSB04.date": new Date(),
      },
      { new: true }
    );

    if (!updatedProject) {
      return res.status(404).send({ message: "Project not found" });
    }

    res.status(200).send({
      message: "Project approved successfully!",
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
        "status.CSB04.status": "failed",
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

app.post("/score-csb04", async (req, res) => {
  const { projectId, unconfirmScore, comment, referee } = req.body.params;

  try {
    let existingCsb04 = await csb04.findOne({ projectId });

    if (existingCsb04) {
      existingCsb04.unconfirmScore = unconfirmScore;
      existingCsb04.referee = referee || [];
      existingCsb04.comment = comment || "";
      const updatedCsb04 = await existingCsb04.save();

      res.json({
        message: "CSB04 score updated successfully",
        project: {
          _id: updatedCsb04._id,
          projectId: updatedCsb04.projectId,
          unconfirmScore: updatedCsb04.unconfirmScore,
          comment: updatedCsb04.comment,
          referee: updatedCsb04.referee,
        },
      });
    } else {
      const newCsb04 = new csb04({
        projectId,
        unconfirmScore,
        referee,
        comment,
      });

      const savedCsb04 = await newCsb04.save();

      res.json({
        message: "CSB04 score saved successfully",
        project: {
          _id: savedCsb04._id,
          projectId: savedCsb04.projectId,
          unconfirmScore: savedCsb04.unconfirmScore,
          comment: savedCsb04.comment,
          referee: savedCsb04.referee,
        },
      });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error updating CSB04", error: error.message });
  }
});

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
        "status.CSB04.status": isPassed ? "passed" : "failed",
        "status.CSB04.score": confirmScore,
        "status.CSB04.date": new Date(),
      },
      { new: true }
    );

    if (!updatedProject) {
      return res.status(404).json({ message: "Project not found." });
    }

    // if (existingCsb04) {
    //   // Update existing entry
    //   existingCsb04.confirmScore = confirmScore;
    //   existingCsb04.logBookScore = logBookScore;
    //   existingCsb04.grade = grade;
    //   await existingCsb04.save();
    //   return res.json({
    //     message: "CSB02 updated successfully!",
    //     data: existingCsb04,
    //   });
    // } else {
    //   // Create a new entry
    //   const newCsb04 = new csb04({
    //     projectId,
    //     confirmScore,
    //     logBookScore,
    //     grade,
    //   });
    //   await newCsb04.save();
    //   return res.json({
    //     message: "CSB02 created successfully!",
    //     data: newCsb04,
    //   });
    // }

    res.json({
      message: "CSB03 updated successfully",
      project: updatedProject,
    });
  } catch (error) {
    console.error("Error saving CSB03:", error);
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
        "status.CSB04.status": "passed",
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

app.post(
  "/sumary-room-by-name-exam",
  middlewareExtractJwt,
  async (req, res) => {
    const { examName } = req.body;
    const { username } = req.user;
    console.log(`username:${username}:${examName}`);

    if (!examName) {
      return res.status(400).json({ message: "Missing examName" });
    }

    try {
      var resultData = {
        body: [],
      };

      if (examName == "สอบหัวข้อ") {
        const rooms = await Room.find({ nameExam: examName });
        for (const room of rooms) {
          //find by username but only status is waiting

          const csb01data = await csb01.find({
            "referee.T_id": username,
            "referee.status": "waiting",
          });
          console.log("CSB01 Data:", csb01data);

          var dataWithProjectName = [];
          for (const data of csb01data) {
            const Data = await Project.findById(data.projectId);
            if (
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
          const result = {
            dateExam: room.dateExam,
            projects: dataWithProjectName,
          };

          if (dataWithProjectName.length > 0) {
            resultData.body.push(result);
          }
        }
      } else if (examName == "สอบก้าวหน้า") {
        const rooms = await Room.find({ nameExam: examName });
        for (const room of rooms) {
          const csb02data = await csb02.find({
            "referee.T_id": username,
            "referee.status": "waiting",
          });
          var dataWithProjectName = [];
          for (const data of csb02data) {
            const Data = await Project.findById(data.projectId);
            if (
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
          const result = {
            dateExam: room.dateExam,
            projects: dataWithProjectName,
          };
          if (dataWithProjectName.length > 0) {
            resultData.body.push(result);
          }
        }
      } else if (examName == "สอบป้องกัน") {
        const rooms = await Room.find({ nameExam: examName });
        for (const room of rooms) {
          const csb03data = await csb03.find({
            "referee.T_id": username,
            "referee.status": "waiting",
          });
          var dataWithProjectName = [];
          for (const data of csb03data) {
            const Data = await Project.findById(data.projectId);
            if (
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
          const result = {
            dateExam: room.dateExam,
            projects: dataWithProjectName,
          };
          if (dataWithProjectName.length > 0) {
            resultData.body.push(result);
          }
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

    if (role !== "student" && role !== "teacher" && role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const newToken = jwt.sign(
      { username: decoded.username, role: decoded.role },
      process.env.JWT_SECRET
    );

    res.json({
      username: decoded.username,
      role: decoded.role,
      jwtToken: newToken,
    });
  } catch (error) {
    console.error("Error in verifying token:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/auth/login", async (req, res) => {
  let { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Missing credentials" });
  }

  // trim username

  username = username.trim();
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

          newStudent.save();
        }
        const jwtToken = jwt.sign(
          { username: response.data.userInfo.username, role: "student" },
          process.env.JWT_SECRET
        );
        console.log("Role:", "student");
        return res.json({
          username: response.data.userInfo.username,
          role: "student",
          jwtToken,
        });
      }

      if (role === "personel") {
        if (adminUser.includes(username)) {
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
            newAdmin.save();
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
          newTeacher.save();
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
      await file.create({
        fi_id: studentId,
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

      res.status(200).json({ message: "Files uploaded" });
    });
  } catch (error) {
    console.error("Error in file upload process:", error);
    res.status(500).json({ message: "Server error during file upload." });
  }
});

app.patch("/files/:fi_id", async (req, res) => {
  const { fi_id } = req.params;

  try {
    const result = await file.findOneAndUpdate({ fi_id }, { new: true });

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

app.get("/files", async (req, res) => {
  let File = await file.find();
  res.json({ body: File });
});

//anouncement
app.get("/anouncements", async (req, res) => {
  try {
    const anouncements = await anouncement.find(); // or whatever your query is
    console.log("Fetched announcements:", anouncements);
    res.json({ data: { body: anouncements } }); // Ensure it follows the expected structure
  } catch (error) {
    console.error("Error fetching announcements:", error);
    res.status(500).json({ message: "Error fetching announcements" });
  }
});

app.post("/anouncements", async (req, res) => {
  const { Exam_o_CSB01, Exam_o_CSB02, Exam_o_CSB03, Exam_o_CSB04 } = req.body;

  try {
    let Anouncement = await anouncement.findOneAndUpdate(
      {}, // Empty filter to update the first record
      {
        examcsb01: Exam_o_CSB01,
        examcsb02: Exam_o_CSB02,
        examcsb03: Exam_o_CSB03,
        examcsb04: Exam_o_CSB04,
      },
      { new: true, upsert: true } // Create if doesn't exist
    );

    res
      .status(200)
      .json({ message: "Exam status updated successfully", Anouncement });
  } catch (error) {
    console.error("Error updating exam status:", error);
    res.status(500).json({ message: "Failed to update exam status" });
  }
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
          (ref) => ref.status !== "waiting"
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

      // Check if a record was found
      if (!csb02Record) {
        return res
          .status(404)
          .json({ message: "User does not have the role of 'main' in csb02" });
      }

      for (const data of csb02Record) {
        const allNotWaiting = data.referee.every(
          (ref) => ref.status !== "waiting"
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
      let csb03Record = await csb03.find({
        referee: {
          $elemMatch: {
            T_id: username,
            role: "main",
          },
        },
        confirmScore: 0,
      });

      // Check if a record was found
      if (!csb03Record) {
        return res
          .status(404)
          .json({ message: "User does not have the role of 'main' in csb03" });
      }
      for (const data of csb03Record) {
        const allNotWaiting = data.referee.every(
          (ref) => ref.status !== "waiting"
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

module.exports = app;
