const express = require('express');
const router = express.Router();
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const fs = require('fs');
var configJSON = JSON.parse(fs.readFileSync('./config.json'));
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({ //This defines how the Data is sent in the Email 
    host: 'smtp.gmail.com', // SMTP hostname for Gmail
    port: 465, // secure:true for port 465, secure:false for port 587
    secure: true, // port for secure SMTP
    auth: {
        user: configJSON.gmail.email,
        pass: configJSON.gmail.password,
    },
});
const mailSenderName = 'Damodharan S';

const mongoose = require('mongoose');
//const db = 'mongodb://sdamodharan:DAMOat10@ds223605.mlab.com:23605/events_db';
const db = 'mongodb://localhost:27017/events_db';
mongoose.connect(db, { useNewUrlParser: true, useFindAndModify: false, useCreateIndex: true }, err => {
    if(err){
        console.error("Error in connecting to the 'events_db'"+ err);
    }else {
        console.log("Connection to the 'events_db' is Successful");
    }
})

function verifyEmailExistence(req, res, next){
    //a simple if/else to check if email already exists in db
    User.findOne({ email: req.body.email }, (err, user) => {        
        if(err) {
            //handle error here
           console.error('Error:'+ err);
           return res.status(500).send(err);
           //return next(error);
        }
        if(user){
            //if a user was found, that means the user's email matches the entered email
            console.log('Email Already Exists in DB');
            res.status(400).send('A User with this Email has already registered. Please use a different Email or try Login...!');
        }else{
            //if no user with entered email was found
            next();
        }
    });
}
function verifyToken(req, res, next){
    if(!req.headers.authorization){ //Express headers are auto converted to lowercase
        res.status(401).send("Unauthorized Request - 1 ('Authorization' key is not present in the HTTP Request)");
    }

    let token = req.headers.authorization.split(' ')[1];
    if(token === 'null' || token === 'undefined'){
        res.status(401).send("Unauthorized Request - 2 (Auth Token is either 'null' or 'undefined')");
    }

    jwt.verify(token, 'secretKey', (err, decoded_token) => {//To Verify the JWT(Token) that was sent as a part of the HTTP Request from the Browser.
        if(err){
            console.log('Token is either Invalid or Expired :-('+ err);
            return res.status(500).send(err);
        }else{
            let payload = decoded_token;
            console.log('payload');
            console.log(payload);
            if(!payload){
                res.status(401).send("Unauthorized Request - 3 ('payload' is 'undefined')");
            }
            req.userId = payload.subject;
            next();
        }
    });
}

router.get('/', (req, res) => { //ES6 Syntax for CallBack function
    res.send("Response is Coming from the Routed Service File 'api.js'");
})

router.post('/register', verifyEmailExistence, (req, res) => {
    let userData = req.body;
    userData.temporaryToken = jwt.sign({email: req.body.email}, 'secretKey', { expiresIn: 60 * 10 });//10 Minutes
    console.log(userData);
    let user = new User(userData);//User Model
    user.save((error, registeredUser) => {
        if(error){
            console.error('Error:'+ error);
        }else {
            let mailOptions = {
                from: `${mailSenderName} damodharangovt@gmail.com`,
                to: userData.email,
                subject: 'Account Activation',
                text: `Hello ${userData.email}..! Thank You for Registering at localhost:4200.Please click on the following link to activate your account http://localhost:4200/activateaccount/${userData.temporaryToken}`,
                html: `Hello <b>${userData.email}</b>..!<br><br>Thank You for Registering at localhost:4200.Please click on the link below to activate your account.<br><a href="http://localhost:4200/activateaccount/${userData.temporaryToken}">http://localhost:4200/activateaccount/</a><br><br>Thanks & Regards<br>${mailSenderName}<br><br>NOTE: This is a Test Email Notification sent from the LocalHost Node Server`
            };
            transporter.sendMail(mailOptions, (error, emailData) => {
                if(error){
                    console.log('err');
                    console.log(error);
                }
                console.log('Account Activation Email sent:');
                console.log(emailData);
            });
            res.status(200).send({accountCreated: true, success: true, message: 'Your Account is created. Please check your Registered Email to activate your Account.'});//ES6 Syntax for Object notation
        }
    });
})

router.put('/activateaccount/:token', (req, res) => {
    console.log('Activate Account API got triggered');
    console.log(req.body);
    User.findOne({temporaryToken: req.params.token}, (err, user) => {
        if(err) throw err;
        let token = req.params.token;
        jwt.verify(token, 'secretKey', (error, decoded_token) => {
            if(error){
                res.status(401).json({success: false, message: 'Activation Link has been expired.'});
            }else if(!user){
                res.status(401).json({success: false, message: "The Account you're trying to activate is either not created yet or the 'temporayToken' key is not present in the particular User Record. Please Register once again with Valid Credentials."});
            }else{
                user.temporaryToken = undefined; //To Delete the "temporaryToken" key from the particular User Record in the DB
                user.active = true;
                user.save((err, updatedUser) => {
                    if(err){
                        console.log('Error: '+ err);
                    }else {
                        let mailOptions = {
                            from: `${mailSenderName} damodharangovt@gmail.com`,
                            to: user.email,
                            subject: 'Activation Succesful',
                            text: `Hello ${user.email}..! Your Account has been successfully Activated`,
                            html: `Hello <b>${user.email}</b>..!<br><br>Your Account has been successfully Activated.<br><br>Thanks & Regards<br>${mailSenderName}<br><br>NOTE: This is a Test Email Notification sent from the LocalHost Node Server`,
                            attachments: [
                                {   //using URL as an attachment
                                filename: 'Greetings.png',
                                path: 'https://img.itch.zone/aW1hZ2UvMTc5MjA0LzgzNzE3NS5wbmc=/original/GEC8ys.png'
                                }
                            ]
                        };
                        transporter.sendMail(mailOptions, (error, emailData) => {
                            if(error){
                                console.log('err');
                                console.log(error);
                            }
                            console.log('Activation Successful Email sent:');
                            console.log(emailData);
                        });
                        res.status(200).send({accountActivated: true, success: true, message: 'Your Account is Activated.'});
                    }
                })
            }
        })
    })
})

router.post('/login', (req, res) => {
    let userData = req.body;console.log('userData');console.log(req.body);
    User.findOne({email: userData.email}, (error, user) => {
        if(error){
            console.log('Error'+ error);
        }else {
            if(!user){
                res.status(401).send('Invalid Email');
            }else {
                if(user.password !== userData.password){
                    res.status(401).send('Invalid Password');
                }else {
                    let payload = {subject: user._id};
                    let token = jwt.sign(payload, 'secretKey', { expiresIn: 60 * 1 });//To Generate a new JWT(Token)
                    User.countDocuments({}, (err, count) => { //To count the no. of records in a collection
                        if(err){
                            console.log("Error in Counting the No. of Records in the 'users' Collection "+ err);
                            return;
                        }
                        console.log('Number of Registered Users: '+ count);
                    });
                    res.status(200).send({token, success: true, message: 'Authentication Successful!'});
                }
            }
        }
    })
})

router.get('/normalevents', (req, res) => {
    let events = [
        {
            "_id":"1",
            "eventname":"Normal Event One",
            "description":"This is conducted by ECE Dept.",
            "date":"2019-01-01T13:59:25.724Z"
        },
        {
            "_id":"2",
            "eventname":"Normal Event Two",
            "description":"This is conducted by EEE Dept.",
            "date":"2019-02-02T13:59:25.724Z"
        },
        {
            "_id":"3",
            "eventname":"Normal Event Three",
            "description":"This is conducted by MECH Dept.",
            "date":"2019-03-03T13:59:25.724Z"
        },
        {
            "_id":"4",
            "eventname":"Normal Event Four",
            "description":"This is conducted by CSE Dept.",
            "date":"2019-04-04T13:59:25.724Z"
        },
        {
            "_id":"5",
            "eventname":"Normal Event Five",
            "description":"This is conducted by ICE Dept.",
            "date":"2019-05-05T13:59:25.724Z"
        },
        {
            "_id":"6",
            "eventname":"NormalEvent Six",
            "description":"This is conducted by IT Dept.",
            "date":"2019-06-06T13:59:25.724Z"
        }
    ]
    res.json(events);
})

router.get('/specialevents', verifyToken, (req, res) => {
    console.log(req.userId);//See the log to find out the difference
    let events = [
        {
            "_id":"1",
            "eventname":"Special Event One",
            "description":"This is conducted by ECE Dept.",
            "date":"2019-01-01T13:59:25.724Z"
        },
        {
            "_id":"2",
            "eventname":"Special Event Two",
            "description":"This is conducted by EEE Dept.",
            "date":"2019-02-02T13:59:25.724Z"
        },
        {
            "_id":"3",
            "eventname":"Special Event Three",
            "description":"This is conducted by MECH Dept.",
            "date":"2019-03-03T13:59:25.724Z"
        },
        {
            "_id":"4",
            "eventname":"Special Event Four",
            "description":"This is conducted by CSE Dept.",
            "date":"2019-04-04T13:59:25.724Z"
        },
        {
            "_id":"5",
            "eventname":"Special Event Five",
            "description":"This is conducted by ICE Dept.",
            "date":"2019-05-05T13:59:25.724Z"
        },
        {
            "_id":"6",
            "eventname":"Special Event Six",
            "description":"This is conducted by IT Dept.",
            "date":"2019-06-06T13:59:25.724Z"
        }
    ]
    res.json(events);
})

router.get('/getprofile', verifyToken, (req, res) => {
    console.log('User ID: '+ req.userId);
    let userId = req.userId;
    User.findOne({_id : userId}, (err, profile) => {
        if(err){
            console.log('Error: '+ err);
        }else{
            res.status(200).send(profile);
        }
    })
})

router.put('/updateprofile/:id', verifyToken, (req, res) => { //":id" is a placeholder for the dynamic id parameter which is appended along with the API while sending the HTTP Request
    console.log('ID Parameter appended and sent along with the API call: ' + req.params.id);
    User.findByIdAndUpdate(req.params.id,
        {
            $set: { email: req.body.email, password: req.body.password}
        },
        {
            new: true //If "new" is set to "true",then the latest saved data in DB will be returned else if "new" is set to "false" then the last saved data in DB will be returned
        },
        (err, updateduserData) => {
            if(err){
                console.log('Error in Updating User Profile: '+ err);
                //res.send('Error in Updating User Profile: ' + err);
            }else {
                res.status(200).json(updateduserData);
            }
        }
    );
})

module.exports = router;