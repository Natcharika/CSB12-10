require("dotenv").config();
require("./config/database").connect();
const express = require("express");
const cors = require("cors");
const auth = require("./middleware/auth");
const multer = require("multer");
const bodyParser = require("body-parser");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Score = require("./model/score.model");
const Project = require("./model/project.model");
const User = require("./model/user.model");
const Room = require("./model/room.model");
const Anouncement = require("./model/anouncement.model");
const e = require("express");

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
app.post("/create-form", async (req, res) => {
  const {
    projectName,
    projectType,
    projectStatus,
    projectDescription,
    student,
    lecturer,
  } = req.body;
  // status
  // 0: Not yet
  // 1: Done
  // 2: Cancel

  const projects = await Project.create({
    projectName,
    projectType,
    projectStatus,
    projectDescription,
    student,
    lecturer,
    scoreId: "",
  });

  let calActiveStatus = lecturer.length + student.length; 
  let activeArray = [];
  calActiveStatus.map((item) => {
    activeArray.push(0);
  })

  const scores = await Score.create({
    projectId: projects._id,
    CSB01: {
      roomExam: "",
      dateExam: "",
      referee: [],
      limitReferee: 0,
      totalScore: 0,
      limitScore: 0,
      activeStatus: activeArray,
      resultStatus: 0,
    },
    CSB02: {
      score: 0,
      status: "",
      referee: [],
      limitReferee: 0,
      totalScore: 0,
      limitScore: 0,
      activeStatus: activeArray,
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
      activeStatus: activeArray,
      resultStatus: 0,
    },
    CSB04: {
      score: 0,
      status: "",
      referee: [],
      limitReferee: 0,
      totalScore: 0,
      limitScore: 0,
      activeStatus: activeArray,
      resultStatus: 0,
    },
  });

  await Project.findByIdAndUpdate(projects._id, { scoreId: scores._id });

  res.json({ body: { score: scores, project: projects } });
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
app.get("/lecturers", async (req, res) => {
  const lecturers = await User.find({ account_type: "personal" });
  console.log("lecturers");
  // res.json({ body: lecturers.map(({ _id }) => ({ keyLecturer: _id.username, nameLecturer: _id.displayname })) });
  res.json({
    body: lecturers.map(({ _id, username, displayname }) => ({
      keyLecturer: username,
      nameLecturer: displayname,
    })),
  });
});
app.get("/project-students", async (req, res) => {
  let project = await Project.find();
  res.json({ body: project });
});



// สร้าง sp1-sp2
app.post('/students', async (req, res) => {
  try {
    const { projectValidate } = req.body.data;
    const students = await User.find({ account_type: 'students' });
    console.log(req.body.data);
    let studentIds = students.map(({ username, projectStatus }) => {
      if(projectStatus[0] == projectValidate[0] && projectStatus[1] == projectValidate[1]){
        return username.substring(1); 
      } 
    });
    let projects = await Project.find({
      'student.studentId': { $in: studentIds }
    });
    res.json({ body: projects });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
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


module.exports = app;
