var express = require('express');
var router = express.Router();
var config = require('config');
var url = require('url');
var cache = require('../services/cache');
var crawler = require('../services/price-crawler');
var pdNamespace = config.get("coupang.productNamespace");
var pdURL = config.get("coupang.productURL");
var productKey = config.get("cache.keys.product");

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render("index.html");
});

router.get('/product/:productID', function(req, res, next) {
	var url = pdURL + req.params.productID;
	crawler.getProduct(url).then(function(r) {
		res.json(r);
	});
});

router.get('/history/:productID', function(req, res, next) {
	var productID = req.params.productID;
	crawler.getProductPriceHistory(productID, function(err, ret) {
		if (err) {
			res.status(503);
			res.send(err);
		} else {
			res.json(ret);
		}
	});
});

router.get("/register/list", function(req, res, next) {
	crawler.getProductList(function(err, ret) {
		if (err) {
			res.status(503);
			res.send(err);
		} else {
			var list = [];
			var fetchjob = [];
			for (var i = 0; i < ret.length; i++) {
				var job = new Promise(function(resolve, reject) {
					var productID = ret[i].split(productKey)[1];
					var url = pdURL + productID;
					crawler.getProduct(url).then(function(r) {
						resolve(r);
					});
				});
				fetchjob.push(job);
			}
			Promise.all(fetchjob).then(function(ret) {
				console.log(ret);
				res.json(ret);
			}).catch(function(e) {
				console.error(e);
				res.status(503);
				res.send(e);
			});
			/*
			for (var i = 0; i < ret.length; i++) {
				(function(i) {
					var productID = ret[i].split(productKey)[1];
					var url = pdURL + productID;
					crawler.getProduct(url).then(function(r) {
						console.log("list push", r);
						list.push(r);
						if (i == ret.length -1) {
							console.log("Send list");
							res.json(list);
						}
					});
				})(i);
			}
			*/
		}
	});
});

router.post('/register/add', function(req, res, next) {
	var productURL = req.body.url;
	var productObj = url.parse(productURL);
	var productID = productObj.pathname.split(pdNamespace)[1];
	// get price and cache
	crawler.getProduct(productURL).then(function(r) {
		if (r.price) {
			var data = r;
			crawler.setProductAvailable(productID, r.available, function(e, r) {
				// do nothing for now
			});
			crawler.setProductPrice(productID, parseInt(r.price), function(err, ret) {
				if (err) {
					res.status(503);
					res.send("caching error");
				} else {
					if (!ret) {
						console.log(productID, "already registered");
						res.json(false);
					} else {
						data["productID"] = productID;
						res.json(data);
					}
				}
			});
		}
	});
});

router.post('/register/remove', function(req, res, next) {
	var productID = req.body.productID;
	console.log("/register/remove", productID);
	cache.removeProduct(productID, function(err, ret) {
		if (err) {
			console.error("/register/remove", productID, err);
			res.status(503);
			res.send(err);
		} else {
			console.log("/register/remove", productID, ret);
			res.json(ret);
		}
	});
});

module.exports = router;
