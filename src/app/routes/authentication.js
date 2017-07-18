(function (Authenticator) {
    "use strict";

    var passport = require('passport'),
        LocalStrategy = require('passport-local').Strategy,
        nconf = require('nconf'),

        logger = require('log4js').getLogger("authenticate"),
        authority = require('./../middleware/authority');

    logger.setLevel(nconf.get("logLevel"));

    Authenticator.initialize = function (app) {
      app.use(passport.initialize());
      app.use(passport.session());
    };

    Authenticator.registerApp = function (app) {
      Authenticator.app = app;
    };

    Authenticator.load = function (app) {
      app.get('/logout', authority.logout);

      app.get('/login', function (req, res) {
        var urlfrom = "/";
        if (req.session.urlfrom){
          urlfrom = req.session.urlfrom;
        }
        res.render('middleware/login.pug', {
          urlfrom: urlfrom
        });
      });

      app.get('/check-authorization', function (req, res) {
        res.json({
          connected: req.isAuthenticated()
        });
      });

      app.post('/logout', authority.logout);
      app.post('/login', function (req, res, next) {
        authority.authenticate(req, res, next);
      });
    };

    passport.use(new LocalStrategy(authority.login));

    passport.serializeUser(function (user, done) {
      done(null, user);
    });

    passport.deserializeUser(function (user, done) {
      done(null, {
        uid: user.uid,
        username: user.username
      });
    });
}(exports));
