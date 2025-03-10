const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const User = require('../models/User')
const Faculty = require('../models/Faculty')
const Topic = require('../models/Topic')
const Article = require('../models/Article')
const RequestLog = require('../analytics_service')
const { Logout } = require('../Login')

router.get('/', isAdmin, async (req, res) => {
    const user = await User.findById(req.session.userId)
    const analytics = await RequestLog.getAnalytics()
    const countTotalArticle = await Article.find().estimatedDocumentCount()
    const countTotalTopic = await Topic.find().estimatedDocumentCount()
    const countTotalFaculty = await Faculty.find().estimatedDocumentCount()
    const countTotalAccount = await User.find().estimatedDocumentCount()
    const countTotalUser = await User.find({role:'user'}).countDocuments()
    const countTotalCoordinator = await User.find({role:'coordinator'}).countDocuments()
    const countTotalAdmin = await User.find({role:'admin'}).countDocuments()
    const array = analytics.requestsPerDay
    let d = new Date()
    let day = array[d.getDay()]
    console.log(day)
    res.render('admin/index', {
        user: user,
        countTotalFaculty : countTotalFaculty,
        countTotalTopic: countTotalTopic,
        countTotalArticle : countTotalArticle,
        totalRequests: analytics.totalRequests,
        day: analytics.requestsPerDay[0]._id,
        requestsInDay: analytics.requestsPerDay[0].requestsInDay,
        totalAccount: countTotalAccount,
        totalUser : countTotalUser,
        totalCoordinator: countTotalCoordinator,
        totalAdmin: countTotalAdmin
    })
})

//User function

router.get('/user', async (req, res) => {
    let query = User.find()
    if (req.query.name != null && req.query.name != '') {
        query = query.regex('name', new RegExp(req.query.name, 'i'))
    }
    try {
        const user = await query.populate('faculty').exec()
        res.render('admin/user', {
            user: user,
            searchOptions: req.query
        })
    } catch (err) {
        console.log(err)
        res.redirect('/admin')
    }
})

router.get('/user/new', isAdmin, async (req, res) => {
    const faculty = await Faculty.find({})
    res.render('admin/register', {
        faculty: faculty
    })
})

router.post('/user/new', isAdmin, async (req, res) => {
    const ExistedUser = await User.findOne({ username: req.body.username })
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    const newUser = new User({
        name: req.body.name,
        username: req.body.username,
        password: hashedPassword,
        role: req.body.role,
        faculty: req.body.faculty
    })
    try {
        if (!ExistedUser){
        await newUser.save()
        res.redirect('/admin')
        } else {
            req.flash('errorMessage','Username already used')
            req.redirect('back')
        }
    } catch (err) {
        console.log(err)
        res.redirect('/admin/user/new')
    }
})

router.get('/user/:id', isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate("faculty").exec()
        console.log(user)
        res.render('admin/showUser', {
            user: user
        })
    } catch (err) {
        console.log(err)
        res.redirect('/admin/user')
    }
})

router.get('/user/:id/edit', isAdmin, async (req, res) => {
    try {
        const faculty = await Faculty.find({})
        const user = await User.findById(req.params.id)
        const params = {
            user: user,
            faculty: faculty
        }
        res.render('admin/editUser', params)
    } catch (err) {
        console.log(err)
        res.redirect(`/admin/user/${user._id}`)
    }
})

router.put('/user/:id/edit', isAdmin, async (req, res) => {
    const newName = req.body.name;
    const newUserName = req.body.username;
    const newPassword = req.body.password;
    const newRole = req.body.role;
    const newFaculty = req.body.faculty

    try {
        const user = await User.findById(req.params.id)
        if (!!newName) {
            user.name = newName;
        }
        if (!!newUserName) {
            user.username = newUserName;
        }
        if (!!newRole) {
            user.role = newRole;
        }
        if (!!newFaculty) {
            user.faculty = newFaculty;
        }
        if (!!newPassword) {
            const hashedPassword = await bcrypt.hash(newPassword, 10)
            user.password = hashedPassword
        }
        await user.save()
        return res.redirect(`/admin/user/${user._id}`)
    } catch (err) {
        console.log(err)
        if (faculty != null) {
            req.flash('errorMessage', 'Cannot edit this faculty')
            res.redirect('back')
        } else {
            res.redirect('/admin/user/' + req.params.id)
        }
    }
})

router.delete('/user/:id', isAdmin, async (req, res) => {
    let user
    try {
        user = await User.findById(req.params.id)
        await user.remove()
        res.redirect('/admin/user')
    } catch {
        if (faculty != null) {
            req.flash('errorMessage', 'Could not delete the user')
            res.redirect('back')
        } else {
            res.redirect(`/user/${user._id}`)
        }
    }
})

//Faculty Function

router.get('/faculty', isAdmin, async (req, res) => {
    let query = Faculty.find()
    if (req.query.name != null && req.query.name != '') {
        query = query.regex('name', new RegExp(req.query.name, 'i'))
    }
    try {
        const faculty = await query.exec()
        res.render('admin/faculty', {
            faculty: faculty,
            searchOptions: req.query
        })
    } catch (err) {
        console.log(err)
        res.redirect('/admin')
    }

})

router.get('/faculty/new', isAdmin, (req, res) => {
    res.render('admin/newFaculty')
})

router.post('/faculty/new', async (req, res) => {
    try {
        const existedFaculty = await Faculty.findOne({ name: req.body.name })
        const newFaculty = new Faculty({
            name: req.body.name,
            description: req.body.description
        })
        if (existedFaculty == null) {
            await newFaculty.save()
            res.redirect('/admin/faculty')
        } else { 
            req.flash('errorMessage', 'Faculty Existed')
            res.redirect('back')
        }
    } catch (err) {
        console.log(err)
        res.redirect('/admin/faculty')
    }
})

router.get('/faculty/:id', isAdmin, async (req, res) => {
    try {
        const faculty = await Faculty.findById(req.params.id)
        console.log(faculty)
        const topic = await Topic.find({ faculty: faculty._id })
        console.log(topic)
        res.render('admin/showFaculty', {
            faculty: faculty,
            topic: topic
        })
    } catch (err) {
        console.log(err)
        res.redirect('/admin/faculty')
    }
})

router.get('/faculty/:id/edit', isAdmin, async (req, res) => {
    try {
        const faculty = await Faculty.findById(req.params.id)
        const params = {
            faculty: faculty
        }
        res.render('admin/editFaculty', params)
    } catch (err) {
        console.log(err)
        res.redirect(`/admin/faculty/${faculty._id}`)
    }
})

router.put('/faculty/:id/edit', isAdmin, async (req, res) => {
    let faculty
    try {
        faculty = await Faculty.findById(req.params.id)
        faculty.name = req.body.name
        faculty.description = req.body.description
        await faculty.save()
        res.redirect(`/admin/faculty/${faculty._id}`)
    } catch (err) {
        console.log(err)
        if (faculty != null) {
            req.flash('errorMessage', 'Cannot edit this faculty')
            res.redirect('back')
        } else {
            res.redirect(`/admin/faculty/${faculty._id}`)
        }
    }
})

router.delete('/faculty/:id', isAdmin, async (req, res) => {
    let faculty
    try {
        faculty = await Faculty.findById(req.params.id)
        await faculty.remove()
        res.redirect('/admin/faculty')
    } catch {
        if (faculty != null) {
            req.flash('errorMessage', 'Could not delete the faculty')
            res.redirect('back')
        } else {
            res.redirect(`/faculty/${faculty._id}`)
        }
    }
})

function isAdmin(req, res, next) {
    console.log(req.session)
    if (req.session.isAdmin === true) { next() }
    else if (req.session.isCoordinator === true) { return res.redirect('/coordinator') }
    else if (req.session.isUser === true) { return res.redirect('/user') }
    else { res.redirect('/') }
}

router.get('/logout', Logout)

module.exports = router