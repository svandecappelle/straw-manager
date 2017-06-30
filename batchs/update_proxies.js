#!/usr/bin/env node

var path = require('path'),
  proxyUpdater = require(path.resolve(__dirname, '../src/proxy-update'));

proxyUpdater.update();
