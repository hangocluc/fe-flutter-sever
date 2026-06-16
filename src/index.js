require('./polyfill-fetch')
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const app = express();
const handlebars = require('express-handlebars');
// const morgan = require('morgan');
const { extname } = require('path');
const path = require('path')
const { startStudyReminderJobs } = require('./app/jobs/studyReminderJob')

const db = require('./config/db')
const { initFirebaseAdmin } = require('./config/firebase')
const { verifyMailConfig } = require('./config/mail')
const route = require('./app/routes')
const port = 3001;
//import thư  viện socket
var server = require("http").Server(app)
const Chat = require('./app/model/ChatModel')
const User = require('./app/model/UserModel')
var io = require('socket.io')(server)

//HTTP logger
// app.use(morgan('combined'))

app.use(cors())

//use public folder
app.use(express.static(path.join(__dirname, 'public')))

//body parse giúp xem đc params thông qua body. VD: req.body._ten_param
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

//template handlebars
app.engine('hbs', handlebars({
    extname: '.hbs'
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'resources', 'views'))
// socket

//set route
route(app)

//

var today = new Date();
var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
io.sockets.on('connection', function (socket) {
    console.log("đã kết nối máy chủ thử nghiệm  v1")
    socket.volatile.on('JoinRoomChat', function (chat) {
        const Data = JSON.parse(chat);

        console.log(Data.questionId)
        if (!Data.message == null || !Data.message == '') {
            Chat({
                questionId: Data.questionId,
                userId: Data.userId,
                username: Data.username,
                quizId: Data.questionId,
                vote: Data.vote,
                imageUrl: Data.imageUrl,
                message: Data.message,
                date: date,
            }).save().then(chat => {
                socket.join(Data.questionId)
                io.in(Data.questionId).emit('ChatAtRoom', { data: chat });
            }).catch(e => {

            })


        } else {
            socket.join(Data.questionId)
            io.in(Data.questionId).emit('ChatAtRoom', { data: '' });
        }

    });
    socket.on('ClickLike', function (data, id) {
        const Data = JSON.parse(data);
        Chat.findOne({ _id: Data._id }).then(chat => {
            if (chat != null) {
                var arr = chat.userLiked
                if (chat.userLiked.includes(id)) {
                    chat.vote = Number(chat.vote) - 1
                    var index = arr.indexOf(id);

                    if (index > -1) {
                        arr.splice(index, 1);
                    }
                } else {
                    chat.vote = Number(chat.vote) + 1
                    arr.push(id)

                }
                chat.userLiked = arr
                chat.save().then(c => {
                    Chat.find({ questionId: c.questionId }).then(chats => {
                        socket.join(Data.questionId)
                        io.in(Data.questionId).emit('Refresh', { data: chats });
                    })
                })
            }
        })

    });
    socket.on('userOut', function (id) {
        User.findOne({ _id: id }).then(chat => {
            if (chat != null) {
                // chat.lastSignIn = date
                console.log('user đã out  phòng chat' + chat);

                chat.save().then(c => {
                    io.emit('out', { data: chat })
                })
            }
        })


    });


})


async function bootstrap() {
    initFirebaseAdmin()
    await db.connect();
    startStudyReminderJobs()

    const listenPort = process.env.PORT || port
    const host = process.env.HOST || '0.0.0.0'
    server.listen(listenPort, host, () => {
        console.log(`Server running at http://${host}:${listenPort}`)
        console.log(`LAN: http://<your-ip>:${listenPort}/api/insert-user`)
        verifyMailConfig().catch((err) => {
            console.error('[SMTP] verify error:', err.message || err)
        })
    });
}

bootstrap().catch((err) => {
    console.error('Bootstrap failed. Exiting.', err);
    process.exit(1);
});
