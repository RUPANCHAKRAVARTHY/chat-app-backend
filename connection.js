const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PW}@chatapp.1pk6g.mongodb.net/chatapp?retryWrites=true&w=majority`,()=>{
    console.log("DB connected")
})
