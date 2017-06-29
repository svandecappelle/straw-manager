var request = require('request')
var fs = require('fs')

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
    fs.writeFileSync(path.resolve(__dirname, '../sharedProxy', body)
    fs.writeFileSync(path.resolve(__dirname, '../proxyRU.txt', body)
    console.log('proxy update ok')
  } else {
    console.warn('proxy update failed')
  }
});
