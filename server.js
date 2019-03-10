const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const api = require('./routes/api');

const PORT = 3000;
const app = express();

app.use(bodyParser.json());
app.use(cors());

app.use('/api', api);

app.get('/', function(req, res){
    res.status(200).send('Server is Up & Running');
})

app.listen(PORT, function(){
    console.log('Server is Listening on localhost:'+ PORT +' or http://127.0.0.1:'+ PORT);
})