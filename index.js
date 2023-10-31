const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
var bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const app = express();
const axios = require("axios");
var bodyParser = require("body-parser");
const mysql = require("mysql");
var jwt = require("jsonwebtoken");
const bcrypt1 = require("bcryptjs");

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "aafiya.",
  database: "gather",
});

db.connect(function (err) {
  if (err) throw err;
  console.log("Connected!");
});
const path = require("path");
let hashString = "";
app.use(cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
require("dotenv").config();

app.post("/users/adduser", (req, res) => {
  email = req.body.email;
  password = req.body.password;
  companyName = req.body.companyName;
  industry = req.body.industry;
  position = req.body.position;
  phone = req.body.phone;
  size = req.body.companySize;
  const sql = "SELECT * FROM pyragather_user WHERE email= ?";
  const value = [[email]];
  db.query(sql, [value], async (err, data) => {
    if (err) throw err;
    if (data?.length > 0) {
      return res.status(400).json({ message: "User already exist!" });
    } else {
      const hashedPassword = await bcrypt.hash(password, 12);
      const sql =
        "INSERT INTO pyragather_user (email,password,phone_number,company_name,position,company_size,industry) VALUES ?";
      const value = [
        [email, hashedPassword, phone, companyName, position, size, industry],
      ];
      db.query(sql, [value], (err, data) => {
        if (err) throw err;

        const result = {
          verified: "true",
          email,
        };
        const token = jwt.sign(
          {
            email: email,
            id: data.insertId,
          },
          "mysecret",
          { expiresIn: "1h" }
        );

        res.status(200).json({ result, token });
      });
    }
  });
});

app.post("/users/signup", async (req, res) => {
  if (req.body.googleAccessToken) {
    const { googleAccessToken } = req.body;

    const companySize = req.body.companySize;
    const companyName = req.body.companyName;
    const industry = req.body.industry;
    const position = req.body.position;

    await axios
      .get("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
        },
      })
      .then(async (response) => {
        const gid = response.data.sub;
        const firstName = response.data.given_name;
        const lastName = response.data.family_name;
        const email = response.data.email;
        const picture = response.data.picture;
        const verified = response.data.email_verified;
        console.log(response.data);

        const sql = "SELECT * FROM pyragather_user WHERE email= ?";
        const value = [[email]];
        db.query(sql, [value], (err, data) => {
          if (err) throw err;
          if (data?.length > 0) {
            return res.status(400).json({ message: "User already exist!" });
          } else {
            const sql =
              "INSERT INTO pyragather_user (email,company_name,position,company_size,industry,google_id,email_verified) VALUES ?";
            const value = [
              [
                email,
                companyName,
                position,
                companySize,
                industry,
                gid,
                verified,
              ],
            ];
            db.query(sql, [value], (err, data) => {
              if (err) throw err;

              const result = {
                verified: "true",
                email,
                firstName,
                lastName,
                profilePicture: picture,
              };
              const token = jwt.sign(
                {
                  email: email,
                  id: data.insertId,
                },
                "mysecret",
                { expiresIn: "1h" }
              );

              res.status(200).json({ result, token });
            });
          }
        });
      })
      .catch((err) => {
        res.status(400).json({ message: "Invalid access token!" });
      });
  } else if (req.body.facebookAccessToken) {
    const { facebookAccessToken } = req.body;
    axios
      .get(
        "https://graph.facebook.com/v12.0/me?fields=first_name,last_name,email,picture",
        {
          headers: {
            Authorization: `Bearer ${facebookAccessToken}`,
          },
        }
      )
      .then(async (response) => {
        console.log(response.data);
        const firstName = response.data.first_name;
        const lastName = response.data.last_name;
        const email = response.data.email;
        const picture = response.data.picture.data.url; // Get the URL of the profile picture

        console.log(response.data);

        const sql = "SELECT * FROM pyra_user WHERE email = ?";
        const value = [[email]];

        db.query(sql, [value], (err, data) => {
          if (err) throw err;

          if (data?.length > 0) {
            return res.status(400).json({ message: "User already exists!" });
          } else {
            const insertSql = "INSERT INTO pyra_user (email) VALUES ?";
            const insertValue = [[email]];

            db.query(insertSql, [insertValue], (err, insertData) => {
              if (err) throw err;

              const result = {
                verified: "true",
                email,
                firstName,
                lastName,
                profilePicture: picture,
              };

              const token = jwt.sign(
                {
                  email: email,
                  id: insertData.insertId,
                },
                "mysecret",
                { expiresIn: "1h" }
              );

              res.status(200).json({ result, token });
            });
          }
        });
      })
      .catch((err) => {
        res.status(400).json({ message: "Invalid access token!" });
      });
  }
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "nizuthasli15@gmail.com",
    pass: process.env.GMAILPASSWORD,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.log(error);
  } else {
    console.log(success);
  }
});

app.post("/sendemails/invite", (req, res) => {
  console.log(req.body);
  const recipients = req.body;
  const link = "http://localhost:3000/account";

  recipients.forEach((recipient) => {
    const mailOptions = {
      from: "nizuthasli15@gmail.com",
      to: recipient,
      subject: "Invite to join Pyramidion Gather",
      text: `Hello, please click on the following link: ${link}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(`Failed to send email to ${recipient}: ${error}`);
      } else {
        console.log(`Email sent to ${recipient}: ${info.response}`);
      }
    });
  });
});
app.post("/verifyemail", (req, res) => {
  sendverificationEmail(req.body);
});
const sendverificationEmail = ({ email }, res) => {
  const currentUrl = "http://localhost:8090/";
  const uniqueString = uuidv4();
  const mailOptions = {
    from: "nizuthasli15@gmail.com",
    to: email,
    subject: "Verify your Email",
    html: `<p>Verify your email</p><p>Press Here <a href="${
      currentUrl + "user/verify" + "/" + uniqueString
    }">Verify Email</a></p>`,
  };
  const saltrounds = 10;
  bcrypt
    .hash(uniqueString, saltrounds)
    .then((hashedString) => {
      hashString = hashedString;
      transporter
        .sendMail(mailOptions)
        .then(() => {
          res.json({
            status: "pending",
            message: "verificatn email sent",
          });
        })
        .catch(() => {});
    })
    .catch(() => {
      res.json({
        status: "Failed",
        message: "An Error occured",
      });
    });
};

app.get("/user/verify/:uniqueString", (req, res) => {
  let uniqueString = req.params.uniqueString;
  console.log(uniqueString);
  console.log(hashString);
  bcrypt
    .compare(uniqueString, hashString)
    .then((result) => {
      res.redirect(`http://localhost:3000/emailverified`);
    })
    .catch((error) => {
      console.log(error);
    });
});

app.get("/user/verified", (req, res) => {
  console.log("verified");
});

app.listen(8090, () => {
  console.log("Server is listening at http://localhost:8090");
});
