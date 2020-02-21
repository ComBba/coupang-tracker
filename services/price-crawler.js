var config = require('config');
var schedule = require('node-schedule');
var cheerio = require('cheerio');
var axios = require('axios');
var cache = require('./cache');
var productKey = config.get("cache.keys.product");
var productURL = config.get("coupang.productURL");

var messaging = require('./messaging');

function getProductImg(url) {
	return new Promise(function(resolve, reject) {
		axios.get(url).then(function(res) {
			var body = cheerio.load(res.data);
			var img = body(".prod-image__detail")[0];
			resolve(img.attribs.src);
		})
		.catch(function(error) {
			console.error(err);
			reject(err);
		});
	});
}

function getProductTitle(url) {
	return new Promise(function(resolve, reject) {
		axios.get(url).then(function(res) {
			var body = cheerio.load(res.data);
			var title = body(".prod-buy-header__title")[0];
			resolve(title.children[0].data);
		})
		.catch(function(error) {
			console.error(error);
			reject(error);
		});
	});
}

function getProductIsAvail(url) {
	return new Promise(function(resolve, reject) {
		axios.get(url).then(function(res) {
			var ret = true;
			var body = cheerio.load(res.data);
			var available = body(".oos-label");
			if (available.length != 0) ret = false;
			resolve(ret);
		})
		.catch(function(error) {
			console.error(error);
			reject(error);
		});
	});
}

function getPrice(url) {
	return new Promise(function(resolve, reject) {
		axios.get(url).then(function(res) {
			var price = 0;
			var body = cheerio.load(res.data);
			var pricespan = body(".total-price")[0];
			var productID = url.split(productURL)[1];
			for (var i = 0; i < pricespan.children.length; i++) {
				if (pricespan.children[i].name == "strong") {
					price = parseInt(pricespan.children[i].children[0].data.replace(/,/g, ''));
				}
			}
			cache.getLatestProductPrice(productID, function(err, ret) {
				if (err) {
					console.error(err);
					reject(err);
				} else {
					var oldPrice = parseInt(ret);
					var diff = oldPrice - price;
					resolve({url: url, price: price, pricediff: diff});
				}
			});
		})
		.catch(function (error) {
			console.error(error);
			reject(error);
		});
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

async function getProduct(url) {
	var title = await getProductTitle(url);
	var img = await getProductImg(url);
	var price = await getPrice(url);
	var available = await getProductIsAvail(url);
	var productID = url.split(productURL)[1];
	var product = {productID: productID, title: title, image: img, price: price.price, pricediff: price.pricediff, available: available};
	return product;
}
module.exports.getProduct = getProduct;

function getProductList(cb) {
	cache.getProductList(function(err, ret) {
		if (err) {
			cb(err, null);
		} else {
			cb(null, ret);
		}
	});
}
module.exports.getProductList = getProductList;

function getProductPriceHistory(productID, cb) {
	cache.getProductPriceHistory(productID, function(err, ret) {
		if (err) {
			console.error(err);
			cb(err, null);
		} else {
			cb(null ,ret);
		}
	});
}
module.exports.getProductPriceHistory = getProductPriceHistory;

function setProductPrice(productID, price, cb) {
	cache.isProductRegistered(productID, function(err, ret) {
		if (err) {
			console.error("setProductPrice isProductRegistered err:", err);
			cb(err, null);
		} else {
			if (ret) {
				console.log(productID, "already exists", ret);
				cb(null, null);
			} else {
				cache.setProductPrice(productID, price, function(err, ret) {
					if (err) {
						console.error("setProductPrice err:", err);
						cb(err, null);
					} else {
						console.log("setProductPrice ret:", ret);
						cb(null, ret);
					}
				});
			}
		}
	});
}
module.exports.setProductPrice = setProductPrice;

function setProductAvailable(productID, avail, cb) {
	cache.setProductAvailable(productID, avail, function(err, ret) {
		if (err) {
			console.error("setProductAvailable err:", err);
			cb(err, null);
		} else {
			console.log(productID, "is available:", ret);
			cb(null, ret);
		}
	});
}
module.exports.setProductAvailable = setProductAvailable;

function getLastProductAvail(productID, cb) {
	cache.getLastProductAvail(productID, function(err, ret) {
		if (err) {
			console.error("getLastProductAvail err:", err);
			cb(err, null);
		} else {
			console.log("getLastProductAvail ret:", ret);
			cb(null, ret);
		}
	});
}
module.exports.getLastProductAvail = getLastProductAvail;

function removeProduct(productID, cb) {
	cache.removeProduct(productID, function(err, ret) {
		if (err) {
			cb(err);
		} else {
			cb(null, ret);
		}
	});
}
module.exports.removeProduct = removeProduct;

function priceUpdateBatch(productID) {
	var url = productURL + productID;
	getPrice(url).then(function(r, e) {
		if (e) {
			console.error("Scheduled job get price of", productID, "error:", e);
		} else {
			console.log("Scheduled job get price of", productID, ":", r);
			var newPrice = parseInt(r.price);
			var title = r.title;
			// Compare price change
			cache.getLatestProductPrice(productID, function(err, ret) {
				if (err) {
					console.error(err);
				} else {
					var oldPrice = parseInt(ret);
					cache.getProductPriceHistoryLength(productID, function(err, ret) {
						if (err) {
							console.error(err);
						} else {
							var hlength = parseInt(ret);
							console.log("oldPrice:", oldPrice," newPrice:", newPrice, " history length:", hlength);
							if (oldPrice > newPrice) {
								// price down
								var diff = oldPrice - newPrice;
								console.log(productID, "price down");
								getProduct(url).then(function(r) {
									var msg = "Price DOWN " + diff + "won \n" + r.title + "\n https:" + r.image;
									messaging.sendTelegram(msg);
								});
							} else if (oldPrice < newPrice) {
								// price up
								var diff = newPrice - oldPrice;
								console.log(productID, "price up");
								getProduct(url).then(function(r) {
									var msg = "Price UP " + diff + "won \n" + r.title + "\n https:" + r.image;
									messaging.sendTelegram(msg);
								});
							}

							if (oldPrice == newPrice && hlength > 1) {
								cache.removeProductLastPriceHistory(productID, function(err, ret) {
									if (err) {
										console.error(err);
									} else {
										// set price cache
										cache.setProductPrice(productID, newPrice, function(err, ret) {
											if (err) {
												console.error("Scheduled job cache.setProductPrice", productID, "err:", err);
											} else {
												console.log("Scheduled job cache.setProductPrice", productID, ret);
											}
										});
									}
								});
							} else {
								// set price cache
								cache.setProductPrice(productID, newPrice, function(err, ret) {
									if (err) {
										console.error("Scheduled job cache.setProductPrice", productID, "err:", err);
									} else {
										console.log("Scheduled job cache.setProductPrice", productID, ret);
									}
								});
							}

							// set product availability
							getProductIsAvail(url).then(function(ret, err) {
								if (err) {
									console.error("getProductIsAvail error:", err);
								} else {
									var currentAvail = JSON.parse(ret);
									getLastProductAvail(productID, function(err, ret) {
										if (err) {
											console.error("getLastProductAvail err:", err);
										} else {
											var oldAvail = JSON.parse(ret);
											console.log(url, "availability currentAvail:", currentAvail, "oldAvail:", oldAvail, typeof(currentAvail), typeof(oldAvail));
											if (oldAvail != currentAvail) {
												setProductAvailable(productID, currentAvail, function(err, ret) {
													if (err) {
														console.error("setProductAvailable err:", err);
													} else {
														console.log(productID, "avaialbility set to", currentAvail);
													}
												});
												getProduct(url).then(function(r, e) {
													if (e) {
														console.error("getProductTitle err:", err);
													} else {
														var msg = r.title + " state changed to " + r.available + " https:" + r.image;
														messaging.sendTelegram(msg);
													}
												});
											}
										}
									});
								}
							});
						}
					});
				}
			});
		}
	});
}
module.exports.priceUpdateBatch = priceUpdateBatch;

// get product list
getProductList(function(err, ret) {
	if (err) {
		console.error(err);
	} else {
		// ret is array
		// get price for each and update cache
		for (var i = 0 ; i < ret.length; i++) {
			(function(i) {
				var productID = ret[i].split(productKey)[1];
				priceUpdateBatch(productID);
			})(i);
		}
	}
});

// Run job on every 30 min
var job = schedule.scheduleJob('*/30 * * * *', function() {
	// get product list
	getProductList(function(err, ret) {
		if (err) {
			console.error(err);
		} else {
			// ret is array
			// get price for each and update cache
			for (var i = 0 ; i < ret.length; i++) {
				(function(i) {
					var productID = ret[i].split(productKey)[1];
					priceUpdateBatch(productID);
				})(i);
			}
		}
	});
});

/*
getProductImg(page).then(function(r, e) {
	if (e) {
		console.error(e);
	} else {
		console.log(r);
	}
});

getProductTitle(page).then(function(r, e) {
	if (e) {
		console.error(e);
	} else {
		console.log(r);
	}
});

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
*/
