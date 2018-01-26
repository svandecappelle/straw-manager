const levelup = require('levelup')
const leveldown = require('leveldown')
const db = levelup(leveldown('./mydb'));

// 1) Create our store
class Database {

    constructor () {}

    get (key) {
        return db.get(key);
    }

    store (key, value) {
        return db.put(key, value);
    }

    batch () {
        return db.batch();
    }
}

module.exports = new Database();