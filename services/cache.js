var config = require('config');
var redis = require("redis");
var cacheserver = config.get("redis.server");
var cacheport = config.get("redis.port");
var redisclient = redis.createClient(cacheport, cacheserver, {});
var productKey = config.get("cache.keys.product");
var availKey = config.get("cache.keys.productAvail");
var productHistoryKey = config.get("cache.keys.productHistory");
var productURL = config.get("coupang.productURL");

redisclient.on("error", function(error) {
  console.error(error);
});
redisclient.on('connect', function() {
	console.log("connected to cache");
});
redisclient.on('ready', function() {
	console.log("cache server ready");
});

function isProductRegistered(product, cb) {
	var key = productKey + product;
	redisclient.exists(key, function(err, ret) {
		if (err) {
			cb(err, null);
		} else {
			console.log("cache.isProductRegistered:", ret);
			var exists = true;
			if (ret == 0) exists = false;
			cb(null, ret);
		}
	});
}
module.exports.isProductRegistered = isProductRegistered;

function setProductAvailable(productID, avail, cb) {
	var key = availKey + productID;
	redisclient.set(key, avail, function(err, ret) {
		if (err) {
			cb(err, null);
		} else {
			cb(null, ret);
		}
	});
}
module.exports.setProductAvailable = setProductAvailable;

function getLastProductAvail(productID, cb) {
	var key = availKey + productID;
	redisclient.get(key, function(err, ret) {
		if (err) {
			cb(err, null);
		} else {
			cb(null, ret);
		}
	});
}
module.exports.getLastProductAvail = getLastProductAvail;

function setProductPrice(product, price, cb) {
	var key = productKey + product;
	var historyKey = productHistoryKey + product;

	redisclient.set(key, parseInt(price), function(err, ret) {
		if (err) {
			console.error("setProductPrice product err:", err);
			cb(err, null);
		} else {
			redisclient.hset(historyKey, Date.now(), price, function(err, ret) {
				if (err) {
					console.error("setProductPrice product history err:", err);
					cb(err, null);
				} else {
					console.log("product", product, "set to", price);
					cb(null, ret);
				}
			});
		}
	});
}
module.exports.setProductPrice = setProductPrice;

function getLatestProductPrice(product, cb) {
	var key = productKey + product;
	redisclient.get(key, function(err, ret) {
		if (err) {
			console.error("getLatestProductPrice err:", err);
			cb(err, null);
		} else {
			console.log("getLatestProductPrice", product, ret);
			// returns integer
			cb(null, ret);
		}
	});
}
module.exports.getLatestProductPrice = getLatestProductPrice;

function getProductPriceHistory(product, cb) {
	var key = productHistoryKey + product;
	redisclient.hgetall(key, function(err, ret) {
		if (err) {
			console.error("getProductPriceHistory err:", err);
			cb(err, null);
		} else {
			console.log("getProductPriceHistory:", ret);
			cb(null, ret);
		}
	});
}
module.exports.getProductPriceHistory = getProductPriceHistory;

function getProductPriceHistoryLength(product, cb) {
	var key = productHistoryKey + product;
	redisclient.hlen(key, function(err, ret) {
		if (err) {
			console.error("getProductPriceHistoryLength err:", err);
			cb(err, null);
		} else {
			console.log("getProductPriceHistoryLength:", ret);
			cb(null, ret);
		}
	});
}
module.exports.getProductPriceHistoryLength = getProductPriceHistoryLength;

function removeProductLastPriceHistory(productID, cb) {
	var key = productHistoryKey + productID;
	redisclient.hgetall(key, function(err, ret) {
		if (err) {
			console.error("removeProductLastPriceHistory hgetall err:", err);
			cb(err, null);
		} else {
			var keys = Object.keys(ret);
			var lastkey = keys[keys.length - 1];
			redisclient.hdel(key, lastkey, function(e, r) {
				if (e) {
					console.error("removeProductLastPriceHistory hdel err:", e);
					cb(e, null);
				} else {
					console.log("removeProductLastPriceHistory hdel ret:", r);
					cb(null, r);
				}
			});
		}
	});
}
module.exports.removeProductLastPriceHistory = removeProductLastPriceHistory;

function removeProduct(productID, cb) {
	var pkey = productKey + productID;
	var hkey = productHistoryKey + productID;
	var akey = availKey + productID;
	console.log("cache removeProduct", pkey, hkey);

	redisclient.del(pkey, function(e, r) {
		if (e) {
			console.error(e);
			redisclient.del(hkey, function(e, r) {
				if (e) {
					console.error(e);
					cb(e, null);
				} else {
					console.log("removeProduct history:", productID, r);
					cb(null, r);
				}
			});
		} else {
			console.log("removeProduct product:", productID, r);
			redisclient.del(hkey, function(e, r) {
				if (e) {
					console.error(e);
					cb(e, null);
				} else {
					console.log("removeProduct history:", productID, r);
					cb(null, r);
				}
			});
		}
	});

}
module.exports.removeProduct = removeProduct;

function getProductList(cb) {
	var key = productKey + "*";
	redisclient.keys(key, function(err, ret) {
		if (err) {
			console.error("getProductList err:", err);
			cb(err, null);
		} else {
			console.log("getProductList:", ret);
			// returns in array
			cb(null, ret);
		}
	});
}
module.exports.getProductList = getProductList;

