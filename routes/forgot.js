const express = require('express');
const router = express.Router();
const transporter = require('../libs/mailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const queryPromise = require('../libs/dbConnection').queryPromise;

router.get('/', (req, res) => {
    res.render('forgot', {pageName: 'Forgot password'});
});

router.post('/', async (req, res) => {
    try {
        let result = await queryPromise('SELECT id, userName FROM users WHERE email=?', [req.body.email]);

        if (result[0]) {
            const payload = {
                id: result[0].id,
                userName: result[0].userName,
                rand: Math.random() * 1000000
            };

            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 7200 });   // expires in 2 hours

            await queryPromise('INSERT INTO tokens (userId, token) VALUES (?, ?)', [result[0].id, token]);

            await transporter.sendMail({
                from: '"Test" <'+process.env.GMAIL_USER+'>',
                to: req.body.email,
                subject: 'Resetting password',
                text: 'Click the link to reset your password: http://localhost:3000/forgot/'+token
                //TODO: add link in case if user do not want to reset password, then token should be deleted
            });

            res.send('Check your email!');
        } else res.send('No user with such email! Change the email address and try again or sign up, please!');
    } catch (err) { res.render('error', {message: 'Wow! Something\'s wrong...', error: err}); }
});

router.get('/:token', async (req, res) => {
    try {
        let result = await queryPromise('SELECT * FROM tokens WHERE token=?',[req.params.token]);
        if (result[0]) {
            jwt.verify(req.params.token, process.env.JWT_SECRET, async (err, decoded) => {
                if (err) {
                    await queryPromise('DELETE FROM tokens WHERE token=?', [req.params.token]);
                    res.send('Your token is not valid!');
                }
                else res.render('changePassword', {pageName: 'Change password', userName: decoded.userName});
            });
        } else res.send('There is no such token!');
    } catch (err) { res.render('error', {message: 'Wow! Something\'s wrong...', error: err}); }
});

router.post('/:token', async (req, res) => {
    try {
        let result = await queryPromise('SELECT * FROM tokens WHERE token=?',[req.params.token]);
        if (result[0]) {
            jwt.verify(req.params.token, process.env.JWT_SECRET, async (err, decoded) => {
                if (err) {
                    await queryPromise('DELETE FROM tokens WHERE token=?', [req.params.token]);
                    res.send('Your token is not valid!----');
                }

                if (req.body.userPassword == req.body.userPassword2) {
                    await queryPromise('UPDATE users SET password=? WHERE id=?', [bcrypt.hashSync(req.body.userPassword, 5), decoded.id]);
                    await queryPromise('DELETE FROM tokens WHERE token=?', [req.params.token]);

                    const payload = {
                        id: decoded.id,
                        userName: decoded.userName
                    };
                    const token = jwt.sign(payload, process.env.JWT_SECRET);
                    res.cookie('token', token);
                    res.redirect('/profile');
                } else res.send('Incorrect conformation of password. Try again, please!');
            });
        } else res.send('There is no such token!');
    } catch (err) { res.render('error', {message: 'Wow! Something\'s wrong...', error: err}); }
});

module.exports = router;