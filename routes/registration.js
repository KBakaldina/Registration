const express = require('express');
const router = express.Router();
const actionRegistration = require('../actions/registration');
const jwt = require('jsonwebtoken');


/* GET registration page.*/
router.get('/', (req, res) => {
    res.render('registration');
});

/* POST registration page.*/
router.post('/', async(req, res) => {
    try {
        let result = await actionRegistration(req.body.userName, req.body.email, req.body.userPassword, req.body.userPassword2);

        if(result.id)
        {
            const payload = {
                id: result.id,
                userName: req.body.userName
            };
            const token = jwt.sign(payload, process.env.JWT_SECRET);
            res.cookie('token', token);
            res.redirect('/profile');
        } else res.send(''+result.msg);
    } catch(err) { res.send(err); }
});

module.exports = router;