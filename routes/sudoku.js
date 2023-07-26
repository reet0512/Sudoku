const express = require('express')
const router = express.Router()
const User = require('../models/user')

const shuffleArray = array => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
}

// Declaring some global variables
let NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
let board = new Array(81).fill(0)
let diff = 'easy'
const NUM_SQUARES = 81
const DIFFICULTY = {
    'easy': 5,
    'medium': 15,
    'hard': 30,
    'veryHard': 60
}
const DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard', 'veryHard']

router.get('/custom', (req, res) => {
    res.render('sudoku/custom')
})

router.post('/solution', (req, res) => {
    board = new Array(81).fill(0)
    for(let i = 0; i < 81; i++) {
        let val = parseInt(req.body['block-'+i])
        if(isNaN(val) || val > 9 || val < 1 ) {
            continue
        } else {
            if(acceptable(board, i, val)) {
                board[i] = val
            } else {
                let errorMessage = 'No solutions possible'
                res.render('sudoku/custom', {errorMessage})
                return
            }
        }
    }

    function solve() {
        let { index, moves } = bestBet(board);    // find the best place to fill
        if (index == null) return true;           // we filled'em all, success!
        for (let m of moves) {
            board[index] = m;                     // try one choice
            if (solve()) return true;             // if we solved further, success!
        }
        board[index] = 0;                         // no digit fits here, backtrack!
        return false;
    }
    solve()

    let showAnother = true
    res.render('sudoku/solution', {board, showAnother})
})

router.get('/new', (req, res) => {
    res.render('sudoku/choose')
})

router.post('/new', (req, res) => {
    const difficulty = req.body.difficulty
    res.redirect('/sudoku/new/' + difficulty)
})

router.get('/new/:difficulty', async(req, res) => {
    diff = req.params.difficulty
    board = new Array(81).fill(0)

    // Fill board with a solved sudoku puzzle
    function fillBoard() {
        let i = 0
        while(i < NUM_SQUARES) {
            if(board[i] == 0) {
                shuffleArray(NUMBERS)
                for(let j of NUMBERS) {
                    if(acceptable(board, i, j)) {
                        board[i] = j
                        if(checkFull(board)) {
                            return true;
                        } else if(fillBoard(board)) {
                            return true;
                        }
                    }
                }
                break;
            }
            i++
        }
        board[i] = 0
    }
    fillBoard()

    let gameBoard = []
    for(let i = 0; i < 81; i++) {
        gameBoard.push(board[i])
    }

    let attempts = DIFFICULTY[diff]
    while(attempts > 0) {
        let row = Math.floor(Math.random() * 9)
        let col = Math.floor(Math.random() * 9)
        let index = coordToindex(row, col)
        let val = gameBoard[index]
        gameBoard[index] = 0
        let m = getChoices(gameBoard, index);
        if(m.length == 0) {
            gameBoard[index] = val
            attempts++
        }
        attempts--
    }
    try {
        if(process.env.LOGIN_STATUS != 'Null') {
            const index = DIFFICULTY_OPTIONS.indexOf(diff)
            const user = await User.findById(process.env.LOGIN_STATUS).exec()
            user.gamesPlayed[index]++
            user.save()
            process.env.UPDATE_ONCE = 'false'
        }
    } catch(err) {
        console.log(err)
    }
    
    outputDiff = diff == 'veryHard' ? 'Very Hard' : (diff[0].toUpperCase() + diff.substring(1))
    res.render('sudoku/game', {gameBoard, outputDiff})
})

router.post('/checkSolution', async(req, res) => {
    let tempBoard = new Array(81).fill(0)
    let correct = true
    for(let i = 0; i < 81; i++) {
        let val = parseInt(req.body['block-'+i])
        if(isNaN(val) || val > 9 || val < 1 ) {
            correct = false
            break
        } else {
            if(acceptable(tempBoard, i, val)) {
                tempBoard[i] = val
            } else {
                correct = false
                break
            }
        }
    }
    let errorMessage = null
    
    if(correct) {
        errorMessage = 'Congratulations on solving the puzzle!'
        try {
            if(process.env.LOGIN_STATUS != 'Null') {
                if(process.env.UPDATE_ONCE == 'false') {
                    const index = DIFFICULTY_OPTIONS.indexOf(diff)
                    const user = await User.findById(process.env.LOGIN_STATUS).exec()
                    user.gamesWon[index]++
                    user.save()
                    errorMessage += ' Your win count has incremented by 1.'
                } else {
                    errorMessage += ' However, this will not count towards an extra win.'
                }

            }
        } catch(err) {
            console.log(err)
        }
        
    } else 
        errorMessage = 'There was an error in your solution'

    process.env.UPDATE_ONCE = 'true'
    let showAnother = false
    res.render('sudoku/solution', {board, showAnother, errorMessage})
})

router.get('/game/solution', (req, res) => {
    process.env.UPDATE_ONCE = 'true'
    let showAnother = false
    res.render('sudoku/solution', {board, showAnother})
})

// Conversion methods
function indexToCoord(index) {
    return { row: Math.floor(index / 9), col: index % 9 };
}
function coordToindex(row, col) {
    return row * 9 + col;
}

// Check if value is valid for an index
function acceptable(board, index, value) {
    let { row, col } = indexToCoord(index);
    // Check the col
    for (let r = 0; r < 9; ++r)
        if (board[coordToindex(r, col)] == value) return false;

    // Check the row
    for (let c = 0; c < 9; ++c)
        if (board[coordToindex(row, c)] == value) return false;

    // Check grid
    let r1 = Math.floor(row / 3) * 3;
    let c1 = Math.floor(col / 3) * 3;
    for (let r = r1; r < r1 + 3; ++r) {
        for (let c = c1; c < c1 + 3; ++c) {
            if (board[coordToindex(r, c)] == value) return false;
        }
    }
    return true;
}

// Get choices and prioritize unique grid values
function getChoices(board, index) {
    let choices = [];
    for (let value = 1; value <= 9; ++value) {
        if (acceptable(board, index, value)) {
            if (unique(board, index, value))
                return [ value ]; // it's useless to try anything else
            else
                choices.push(value);
        }
    }
    return choices;
}

function unique(board, index, value) {
    let { row, col } = indexToCoord(index);
    let r1 = Math.floor(row / 3) * 3;
    let c1 = Math.floor(col / 3) * 3;
    for (let r = r1; r < r1 + 3; ++r) {
        for (let c = c1; c < c1 + 3; ++c) {
            let i = coordToindex(r, c);
            if (i != index && !board[i] && acceptable(board, i, value)) {
                return false;
            }
        }
    }
    return true;
}

function bestBet(board) {
    let index, moves, bestLen = 100;
    for (let i = 0; i < NUM_SQUARES; ++i) {
        if (!board[i]) {
            let m = getChoices(board, i);
            if (m.length < bestLen) {
                bestLen = m.length;
                moves = m;
                index = i;
                if (bestLen == 0) break;
            }
        }
    }
    return { index, moves };
}

// Check if board is full of values
function checkFull(board) {
    for(let i = 0; i < NUM_SQUARES; i++) {
        if(board[i] == 0) {
            return false
        }
    }
    return true
}


// router.post('/new', (req, res) => {
//     const difficulty = req.body.difficulty
//     res.redirect('/game/new/' + difficulty)
// })

// router.get('/new/:difficulty', (req, res) => {
//     const difficulty = req.params.difficulty
//     res.render('game/new', {difficulty})
// })

module.exports = router