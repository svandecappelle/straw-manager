var Engine = require("../engine/engine"),
  cheerio = require('cheerio'),
  _ = require('underscore'),
  async = require('async');

class EasyParapharmacie extends Engine {

  constructor(use_proxy) {
    super();
    this.use_proxy = use_proxy;
    var that = this;
    this.on('home', this.home);
    this.on('product-list', this.product_list);
  };

  call(params) {
    // console.log("calling home");
    this.request(params, 'home');
  };

  home(html, req) {
    var that = this;
    var $ = cheerio.load(html);
    var allLinks = $("#header-nav .level2 a");
    var i = 0;

    async.each(allLinks, function (value) {
      var url = $(value).attr('href');
      if (i > 0) {
        return;
      }
      i += 1;

      if (url) {
        console.log('value.href: '.red + url);
        that.request({
          url: url
        }, 'product-list');
      }
    });
  };

  product_list(html, req) {
    console.log("Product list".red.bold);
    var that = this;
    var $ = cheerio.load(html);
    var products = $(".products-list .product-information");
    async.each(products, function (value) {
      console.log($(value).find("a").first().attr("href").yellow);
      that.request({
        url: $(value).find("a").first().attr("href")
      });
    });

    var nextPage = $(".next.i-next");
    //setTimeout(function(){
    var urlNextPage = nextPage.attr("href");

    if (urlNextPage) {
      console.log("Next page: ".rainbow + urlNextPage);
      that.request({ url: urlNextPage }, 'product-list');
    }
    //}, 5000);

  }

  decode(html, req) {
    console.log("decode".green);
    this.emit("done", { product: 'ok' });
  };

}
module.exports = EasyParapharmacie
