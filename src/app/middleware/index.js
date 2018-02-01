
const merge = require('merge-object');

class Middleware {
  render(req, res, view, obj) {
    res.render(view, merge(obj, {
      refresh_time: 500
    }));
  };
}

module.exports = new Middleware();