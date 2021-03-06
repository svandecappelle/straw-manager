
const passport = require('passport');
const nconf = require('nconf');
const path = require('path');
const logger = require('log4js').getLogger("authority");
const yaml_config = require('node-yaml-config');
const _ = require("underscore");
const bcrypt = require('bcrypt');

const LOGIN_DURATION = 60 * 24;
const LONG_LOGIN_DURATION = LOGIN_DURATION * 14;

class Authority {

  logout(req, res) {
    if (req.isAuthenticated()) {
      logger.info('[Auth] Session ' + req.sessionID + ' logout (uid: ' + req.session.passport.user + ')');
      req.logout();
    }

    res.redirect('/');
  };

  authenticate(req, res, next) {
    passport.authenticate('local', (err, userData, info) => {
      var duration;
      if (err) {
        return res.status(403).render('middleware/403', {
          message: err.message
        });
      }

      if (!userData) {
        logger.warn("login attempt fails: ", info);
        return res.status(403).render('middleware/403', {
          status: 403,
          message: 'login attempt fails'
        });
      }

      // Alter user cookie depending on passed-in option
      if (req.body.remember === 'on') {
        duration = 1000 * 60 * LONG_LOGIN_DURATION
        req.session.cookie.maxAge = duration;
        logger.warn("Saving session for: " + duration + "ms");
      } else {
        duration = 1000 * 60 * LOGIN_DURATION;
        req.session.cookie.maxAge = duration;
      }
      req.logIn({
        uid: userData.uid,
        username: req.body.username
      }, () => {
        if (userData.uid) {
          //user.logIP(userData.uid, req.ip);
          logger.info("user '" + userData.uid + "' connected on: " + req.ip);
        }
        if (req.query["redirect"]) {
          res.redirect(req.query["redirect"]);
        } else {
          res.status(200).json({
            status: 200,
            message: "user connected"
          });
        }
      });

    })(req, res, next);
  };

  login(username, password, done) {

    if (!username || !password) {
      return done(new Error('[[error:invalid-user-data]]'));
    }
    const autorizations = yaml_config.load(path.resolve(__dirname, "../../../config/authorizations.yml")).users;
    var user = _.findWhere(autorizations, { 'username': username });
    if (!user) {
      return done(new Error('error:invalid-password'));
    }
    bcrypt.compare(password, user.password, (err, valid) => {
      if (valid) {
        return done(null, {
          uid: username
        }, '[[success:authentication-successful]]');
      }
      return done(new Error('error:invalid-password'));
    });
  };
}

module.exports = new Authority();
