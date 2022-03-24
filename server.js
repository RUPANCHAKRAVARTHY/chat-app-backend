const express = require('express');
const app = express();
const User = require('./models/User');
const Message = require('./models/Message');
const userRoutes = require('./routes/userRoutes');

const rooms = ['tech', 'sports', 'food', 'general'];
const cors = require('cors');

app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(cors());

app.use('/users', userRoutes)
require('./connection')


const server = require('http').createServer(app);
const PORT = process.env.PORT || 5001;
const io = require('socket.io')(server,{
    cors:{
        origin: '*',
        methods: ['GET', 'POST']
    }
})

//to get the rooms 
app.get('/rooms', (req, res) => {
    res.json(rooms)
})

//function to message from room 
async function getLastMessagesFromRoom(room){
    let roomMessages = await Message.aggregate([
        {$match: {to: room}},
        {$group: {_id: '$date', messagesByDate: {$push: '$$ROOT'}}}
    ])
    return roomMessages;
}

function sortRoomMessagesByDate(messages){
    return messages.sort(function(a, b){
        let date1 = a._id.split('/');
        let date2 = b._id.split('/');

        date1 = date1[2] + date1[0] + date1[1]
        date2 = date2[2] + date2[0] + date2[1]

        return date1 < date2 ? -1 : 1
    })
}

//socket connection
io.on('connection', (socket)=>{
    //for new users connections
    socket.on('new-user', async()=>{
        const members = await User.find();
        io.emit('new-user', members)
    })

  
    socket.on('join-room', async(newRoom, previousRoom)=>{
        socket.join(newRoom);
        socket.leave(previousRoom);
        let roomMessages = await getLastMessagesFromRoom(newRoom);
        roomMessages = sortRoomMessagesByDate(roomMessages);
        socket.emit('room-messages', roomMessages)
    } )

    socket.on('message-room', async(room, content, sender, time, date)=>{
        const newMessage = await Message.create({content, from:sender, time, date, to: room});
        let roomMessages = await getLastMessagesFromRoom(room);
        roomMessages = sortRoomMessagesByDate(roomMessages);
        //sending messages to room
        io.to(room).emit('room-messages', roomMessages);

        socket.broadcast.emit('notifications', room)

    })
    
    app.delete('/logout', async(req,res)=>{
        try{
            const {_id, newMessages} = req.body;
            const user = await User.findById(_id);
            user.status = "offline";
            user.newMessages = newMessages;
            await user.save();
            const members = await User.find();
            socket.broadcast.emit('new-user', members);
            res.status(200).send();
        }catch(error){
            console.log(error);
            res.status(400).send();
        }
    })

} )


server.listen(PORT, ()=>{
console.log('listening to', PORT)
})