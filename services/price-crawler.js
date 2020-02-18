var DomParser = require('dom-parser');
var parser = new DomParser();
var cheerio = require('cheerio');
var axios = require('axios');

var page = "https://www.coupang.com/vp/products/90735575";
var pages = [
	"https://www.coupang.com/vp/products/90735575",
	"https://www.coupang.com/vp/products/17637865",
	"https://www.coupang.com/vp/products/84407384",
	"https://www.coupang.com/vp/products/323567426",
	"https://www.coupang.com/vp/products/55671005"
];

function getPrice(url) {
	return new Promise(function(resolve, reject) {
		axios.get(url).then(function (res) {
			var price = 0;
			var body = cheerio.load(res.data);
			var pricespan = body(".total-price")[0];
			for (var i = 0; i < pricespan.children.length; i++) {
				if (pricespan.children[i].name == "strong") {
					price = parseInt(pricespan.children[i].children[0].data.replace(/,/g, ''));
				}
			}
			resolve({url: url, price: price});
		})
		.catch(function (error) {
			console.log(error);
			reject(error);
		})
	});
}

async function getPrices(arr) {
		var prices = [];
		for (var l = 0; l < arr.length; l++) {
			var url = arr[l];
			var res = await axios.get(url);
			var price = 0;
			var body = cheerio.load(res.data);
			var pricespan = body(".total-price")[0];
			for (var i = 0; i < pricespan.children.length; i++) {
				if (pricespan.children[i].name == "strong") {
					price = parseInt(pricespan.children[i].children[0].data.replace(/,/g, ''));
					prices.push({url: url, price: price});
				}
			}
		}
		return prices;
}

getPrice(page).then(function(r,e) {
	if (e) {
		console.error(e);
	} else {
		console.log(r);
	}
})

getPrices(pages).then(function(r) {
	console.log(r);
});
