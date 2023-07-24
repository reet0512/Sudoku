const mongoose = require('mongoose')
const path = require('path')

const profileImageBasePath = 'uploads/profilePics'

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }, 
    createdAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    follows: {
        type: [mongoose.Schema.Types.ObjectId],
        required: true,
        ref: 'User',
        default: []
    },
    numFollowers: {
        type: Number,
        required: true,
        default: 0
    },
    gamesPlayed: {
        type: [Number],
        required: true,
        default: [0, 0, 0, 0]
    },
    gamesWon: {
        type: [Number],
        required: true,
        default: [0, 0, 0, 0]
    },
    profileImageName: {
        type: String,
        required: true,
        default: 'blank.jpg'
    }
})

userSchema.virtual('profileImagePath').get(function() {
    if(this.profileImageName != null) {
        return path.join('/', profileImageBasePath, this.profileImageName)
    }
})

module.exports = mongoose.model('User', userSchema)
module.exports.profileImageBasePath = profileImageBasePath