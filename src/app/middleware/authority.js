(function (Authority) {
    "use strict";

    var passport = require('passport'),
      nconf = require('nconf'),
      logger = require('log4js').getLogger("authority"),
      _ = require("underscore");

    var LOGIN_DURATION = 60 * 24;
    var LONG_LOGIN_DURATION = LOGIN_DURATION * 14;

    Authority.logout = function (req, res) {
        if (req.isAuthenticated()) {
            logger.info('[Auth] Session ' + req.sessionID + ' logout (uid: ' + req.session.passport.user + ')');
            req.logout();
        }

        res.redirect('/');
    };

    Authority.authenticate = function(req, res, next) {
        passport.authenticate('local', function (err, userData, info) {
            var duration;
            if (err) {
                return next(err);
            }

            if (!userData) {
              logger.warn("login attempt fails: ", info);
              return res.status(403).json({
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
            }, function () {
                if (userData.uid) {
                    //user.logIP(userData.uid, req.ip);
                    logger.info("user '" + userData.uid + "' connected on: " + req.ip);
                }
                if (req.query["redirect"]){
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

    Authority.login = function (username, password, done) {

        if (!username || !password) {
            return done(new Error('[[error:invalid-user-data]]'));
        }
        var autorizations = require("../../../authorizations").users;

        var user = _.where(autorizations, {'username': username, 'password': ''});
        if (user){
          return done(null, {
              uid: username
          }, '[[success:authentication-successful]]');
        }

        return done(new Error('[[error:invalid-password]]'));
    };
}(exports));
