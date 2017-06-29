var request = require('request'),
    fs = require('fs'),
    path = require('path');

request({
  url: 'http://account.fineproxy.org/api/getproxy',
  qs: {
    format: 'txt',
    type: 'httpip',
    //login: 'SuperVIP205927',
    //password: 'pVzLRAIuSD'
    login: 'SuperVIP241409',
    password: 'wClqD67BiX '
  }
}, (error, _ , body) => {
  if (!error) {
    fs.writeFileSync(path.resolve(__dirname, '../sharedProxy', body))
    fs.writeFileSync(path.resolve(__dirname, '../proxyRU.txt', body))
    console.log('proxy update ok')
  } else {
    console.warn('proxy update failed')
  }
});
