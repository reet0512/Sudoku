const express = require('express')
const User = require('../models/user')
const path = require('path')
const bcrypt = require('bcrypt')
const fs = require('fs')

const router = express.Router()

//New user route
router.get('/register', async (req, res) => {
    if(process.env.LOGIN_STATUS != 'Null') {
        res.redirect('/')
    } else {
        renderRegisterPage(res, new User())
    }
})

//Create user route
router.post('/register', async(req, res) => {
    const user = new User({
        username: req.body.username,
        firstName: req.body.firstName,
        lastName: req.body.lastName
    })
    try {
        const checkUser = await User.where('username').equals(req.body.username).limit(1)
        if(checkUser.length == 0) {
            const hashedPassword = await bcrypt.hash(req.body.password, 10)
            user.password = hashedPassword
            const newUser = await user.save()
            res.redirect('/users/login')
        } else {
            renderRegisterPage(res, user, 'Username is taken')
        }
    } catch {
        renderRegisterPage(res, user, 'There was an unexpected error creating your profile')
    }
})

async function renderRegisterPage (res, user, hasError = null) {
    try{
        const params = {
            user: user
        }
        if(hasError) {
            params.errorMessage = hasError
        }
        res.render('users/register', params)
    } catch {
        res.redirect('users/register')
    }
}

router.get('/login', (req, res) => {
    if(process.env.LOGIN_STATUS != 'Null') {
        res.redirect('/')
    } else {
        renderLoginPage(res)
    }
})

router.post('/login', async(req, res) => {
    try {
        const user = await User.where('username').equals(req.body.username).limit(1)
        if(user.length == 0) {
            renderLoginPage(res, 'Cannot find user')
        } else {
            if(await bcrypt.compare(req.body.password, user[0].password)){
                process.env.LOGIN_STATUS = user[0].id
                res.redirect('/')
            } else {
                renderLoginPage(res, 'Incorrect Password')
            }
        }
    } catch (err) {
        renderLoginPage(res)
    }
})

async function renderLoginPage (res, errorMessage = '') {
    res.render('users/login', {errorMessage})
}

router.get('/logout', (req, res) => {
    process.env.LOGIN_STATUS = 'Null'
    res.redirect('/')
})

router.get('/followers', async(req, res) => {
    const query = User.findById(process.env.LOGIN_STATUS).populate('follows')
    try{
        if(process.env.LOGIN_STATUS != 'Null') {
            const user = await query.exec()
            const followers = user.follows
            res.render('users/follows', {followers})
        } else {
            res.redirect('/users/login')
        }
    } catch {
        res.redirect('/')
    }
})

// Find Users route
router.get('/search', async(req, res) => {
    if(process.env.LOGIN_STATUS == 'Null') {
        res.redirect('/users/login')
    }
    let query = User.find({})
    if(req.query.username != null && req.query.username !== '') {
        query = query.regex('username', new RegExp(req.query.username, 'i'))
    } else {
        query = query.where('username').equals('')
    }
    try {
        const users = await query.exec()
        res.render('users/search', {
            users: users,
            searchOptions: req.query
        })
    } catch {
        res.redirect('/')
    }
})

router.get('/:id', async(req, res) => {
    const query = User.findById(req.params.id)
    try {
        if(process.env.LOGIN_STATUS != req.params.id) {
            res.redirect('/users/login')
        } else {
            const user = await query.exec()
            res.render('users/profile', {user})
        }
    } catch {
        res.render('/')
    }    
})

router.get('/:id/edit', async(req, res) => {
    const query = User.findById(req.params.id)
    try {
        if(process.env.LOGIN_STATUS != req.params.id) {
            res.redirect('/users/login')
        } else {
            const user = await query.exec()
            res.render('users/edit', {user})
        }
    } catch {
        res.render('/users/' + req.params.id)
    }
})

router.post('/:id/edit', async(req, res) => {
    const query = User.findById(req.params.id)
    try {
        const user = await query.exec()
        const checkUser = await User.where('username').equals(req.body.username).limit(1)
        if(checkUser.length == 0) {
            user.username = req.body.username
            user.firstName = req.body.firstName
            user.lastName = req.body.lastName
            const updatedUser = await user.save()
            res.redirect('/users/' + req.params.id)
        } else {
            res.redirect('/users/'+req.params.id+'/edit')
        }
    } catch {
        errorMessage = 'Error editing user'
        res.render('/users/' + req.params.id, {errorMessage})
    }
})

router.get('/search/:id', async(req, res) => {
    const query1 = User.findById(process.env.LOGIN_STATUS)
    const query2 = User.findById(req.params.id)
    try {
        if(process.env.LOGIN_STATUS == 'Null') {
            res.redirect('/users/login')
        } else {
            const user = await query1.exec()
            const viewUser = await query2.exec()
            let followStatus = false
            if(user.follows.includes(req.params.id)) {
                followStatus = true
            }
            res.render('users/view', {viewUser, followStatus})
        }
    } catch {
        res.render('/')
    }    
})

router.get('/follow/:id', async(req, res) => {
    const query1 = User.findById(process.env.LOGIN_STATUS)
    const query2 = User.findById(req.params.id)
    try {
        if(process.env.LOGIN_STATUS == 'Null') {
            res.redirect('/users/login')
        } else {
            const user = await query1.exec()
            const followUser = await query2.exec()
            if(!user.follows.includes(req.params.id)) {
                user.follows.push(followUser)
                followUser.numFollowers += 1
                user.save()
                followUser.save()
            } else {
                let index = user.follows.indexOf(req.params.id)
                user.follows.splice(index, 1)
                followUser.numFollowers -= 1
                user.save()
                followUser.save()
            }
            res.redirect('/users/search/'+req.params.id)
        }
    } catch {
        res.redirect('/')
    }
})

module.exports = router