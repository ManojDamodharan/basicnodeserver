const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
    email: { type: String, unique: true },
    password: String,
    active: { type: Boolean, default: false }, //This property/flag should be set to "false" by default
    temporaryToken: { type: String } //The value of this property is defined inside the "/api/register" API
});

module.exports = mongoose.model('user', userSchema, 'users');