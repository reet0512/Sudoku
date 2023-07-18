const express = require('express')
const expressLayouts = require('express-ejs-layouts')
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')
const mongoose = require('mongoose')
const methodOverride = require('method-override')
if(process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const indexRouter = require('./routes/index')
const userRouter = require('./routes/users')
const sudokuRouter = require('./routes/sudoku')

const app = express()
app.set('view engine', 'ejs')
app.set('views', __dirname + '/views')
app.set('layout', 'layouts/layout')
app.use(expressLayouts)
app.use(methodOverride('_method'))
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ limit: '10mb', extended: false}))

mongoose.connect(process.env.DATABASE_URL)
const db = mongoose.connection
db.on('error', error => {
  console.error(error)
})
db.once('open', () => {
  console.log('Connected to Mongoose')
})


app.use('/', indexRouter)
app.use('/users', userRouter)
app.use('/sudoku', sudokuRouter)

app.listen(process.env.PORT || 3000)