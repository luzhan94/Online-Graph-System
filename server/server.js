const express = require("express");
const path = require("path");

var http = require('http');
var socketIO = require("socket.io");
var io = socketIO();
var editorSocketService = require("./services/editorSocketService")(io);

const app = express();

// Connect to MongoDB Atlas
const mongoose = require("mongoose");
mongoose.connect("mongodb+srv://org:org@cluster0-iusaa.mongodb.net/problems");

const restRouter = require("./routes/rest");

app.use('/api/v1', restRouter);

app.use(express.static(path.join(__dirname, '../public')));

// app.listen(8080, () => {
//     console.log("App is listening to port 8080");
// })

const server = http.createServer(app);
io.attach(server);
server.listen(8080);
server.on('listening', () => {
    console.log("App is listening to port 8080");
})

app.use((req, res) => {
    res.sendFile('index.html', {root: path.join(__dirname, '../public')});
})