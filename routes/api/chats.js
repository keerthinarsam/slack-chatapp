
const express = require('express');
const router = express.Router();
const config = require('../../config/database');
const Chat = require('../../models/chat');
const ChatDetail = require('../../models/chatDetail');
const http = require('http').Server(express);
const io = require('socket.io')(http);


router.get('/list', (req, res, next) => {
    Chat.find()
        .sort({ date: -1 })
        .then(chats => res.json(chats));
});

router.post('/create', (req, res) => {
    let newChat = new Chat({
        roomTitle: req.body.roomTitle,
        createdBy: req.body.createdBy
    });

    Chat.addChatRoom(newChat, (err, chat) => {
        if (err) {
            res.json({
                success: false,
                msg: 'Can not create Chat room'
            });
        }
        else {
            res.json ({
                success: true,
                msg: 'Successfully created a chat room'
            });
        }
    });
});


router.get('/detail/:id', (req, res, next) => {
    const chatId = req.params.id;
    Chat.findById(chatId)
        .then(function (chat) {
            if (chat) {
                const queryForMsgs = ChatDetail.find();
                queryForMsgs.where('chatId', chatId);
                queryForMsgs.populate('chatId');
                queryForMsgs.exec(function (err, result) {
                    if (err) {
                        res.json('No chat msgs here'+err);
                    }
                    else {
                        res.json(result);
                    }
                });
            }
        })
        .catch(err => res.status(404).json({ success: false }));
});

router.post('/addMsg/:id', (req, res, next) => {
    const chatId = req.params.id;
    let newMsg = new ChatDetail({
        chatId: chatId,
        chatMsg: req.body.chatMsg,
        msgBy: req.body.msgBy,
    });

    ChatDetail.addChatMsg(newMsg, (err, chatMsgs) => {
        if (err) {
            res.json({
                success: false,
                msg: 'No msg send'
            });
        }
        else {
            // res.json ({success: true, msg: 'Successfully Send a msg'});
            io.on('connection', function (socket) {
                console.log('A New msg send....');
                socket.on('getMsgBy', function(data) {
                    console.log(data);
                    socket.emit('msgData', {msgBy: data});
                });

                socket.on('msgToAll', function(data) {
                    //Send message to everyone
                    io.sockets.emit('newmsg', data);
                });
            });
        }
    });

});


router.delete('/delete/:id', (req, res) => {
    const chatMsgId = req.params.id;
    ChatDetail.findById(chatMsgId)
        .then(chat => chat.remove().then(() => res.json({ success: true })))
        .catch(err => res.status(404).json({ success: false }));
});


router.post('update/:id', (req, res) => {
    const chatMsgId = req.params.id;
    ChatDetail.findById(chatMsgId).exec(function (err, result) {
        result.set({
            chatMsg: req.body.chatMsg,
            msgBy: req.body.msgBy
        });
        result.save(function (err, newResult) {
            if (err) {
                console.log(err);
            } else {
                io.on('connection', function (socket) {
                    console.log('Msg updates....');
                    socket.on('getMsgBy', function(data) {
                        console.log(data);
                        socket.emit('msgData', {msgBy: data});
                    });

                    socket.on('msgToAll', function(data) {
                        //Send message to everyone
                        io.sockets.emit('newmsg', data);
                    });
                });
            }
        });
    });

});

module.exports = router;


