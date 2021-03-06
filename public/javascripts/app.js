$(document).ready(function() {
	var container = document.getElementsByClassName("container");
	if (container.length == 0) {
		container = document.createElement("div");
		container.id = "container";
		container.className = "container";
		document.body.appendChild(container);
	}

	var controls = document.getElementById("controls");
	if (controls == undefined) {
		controls = document.createElement("div");
		controls.className = "row row-list";
		controls.id = "controls";
		container.appendChild(controls);
	}

	var inputpane = document.getElementById("inputpane");
	if (inputpane == undefined) {
		inputpane = document.createElement("div");
		inputpane.id = "inputpane";
		inputpane.className = "col-6";
		controls.appendChild(inputpane);
	}
	var addpane = document.getElementById("addpane");
	if (addpane == undefined) {
		addpane = document.createElement("div");
		addpane.id = "addpane";
		addpane.className = "col-2";
		controls.appendChild(addpane);
	}

	var ifield = document.getElementById("inputfield");
	if (ifield == undefined) {
		ifield = document.createElement("INPUT");
		ifield.id = "inputfield";
		ifield.className = "form-control";
		ifield.setAttribute("type", "");
		inputpane.appendChild(ifield);
	}
	var addbtn = document.getElementById("addbtn");
	if (addbtn == undefined) {
		addbtn = document.createElement("button");
		addbtn.id = "addbtn";
		addbtn.type = "button";
		addbtn.className = "btn btn-success btn-sm";
		addbtn.innerHTML = "ADD";
		addbtn.onclick = function() {
			var url = document.getElementById("inputfield").value;
			if (url) {
				var product = parseURL(url);
				if (product) {
					addTrack(product, function(err, ret) {
						if (err) {
							console.error(err);
						} else {
							if (ret) {
								url = "";
								console.log(product, "added:", ret);
								createPane(ret);
								getPriceHistory(ret.productID);
							} else {
								alert(product + " already registered");
							}
						}
					});
				} else {
					alert("Only coupang web supported");
				}
			} else {
				alert("empty url given");
			}
			document.getElementById("inputfield").value = "";
		}
		addpane.appendChild(addbtn);
	}
	var reloadbtn = document.getElementById("reloadbtn");
	if (reloadbtn == undefined) {
		reloadbtn = document.createElement("button");
		reloadbtn.id = "reloadbtn";
		reloadbtn.type = "button";
		reloadbtn.className = "btn btn-info btn-sm";
		reloadbtn.innerHTML = "reload";
		reloadbtn.onclick = function() {
			getProductList(function(data) {
				for (var i = 0; i < data.length; i++) {
					console.log(data[i]);
					createPane(data[i]);
					getPriceHistory(data[i].productID);
				}
			});
		}
		addpane.appendChild(reloadbtn);
	}


	var content = document.getElementById("content");
	if (content == undefined) {
		content = document.createElement("div");
		content.id = "content";
		content.className = "row row-list";
		container.appendChild(content);
	}

	getProductList(function(data) {
		for (var i = 0; i < data.length; i++) {
			console.log(data[i]);
			createPane(data[i]);
			getPriceHistory(data[i].productID);
		}
	});

	// update page periodically
	setInterval(function() {
		getProductList(function(data) {
			for (var i = 0; i < data.length; i++) {
				console.log(data[i]);
				createPane(data[i]);
				getPriceHistory(data[i].productID);
			}
		});
	}, 10 * 60 * 1000);
});

function parseURL(url) {
	var l = document.createElement("a");
	l.href = url;
	if (l.host == "www.coupang.com") {
		var path = new URL(url);
		var vendorItemId = path.searchParams.get("vendorItemId");
		return {product: l.protocol + "//" + l.hostname + l.pathname, vendorItemId: vendorItemId};
	} else {
		return false;
	}
}

function getNoti(productID, cb) {
	$.getJSON("notify/" + productID, function(r) {
		cb(r);
	});
}

function setNoti(productID, noti, cb) {
	$.ajax({
		url: "notify/" + productID + "/" + noti, type: "POST",
		success: function(data, textStatus, jqXHR) {
			console.log(productID + " set " + noti + " done with " + data);
			cb(null, data);
		},
		error: function(jqXHR, textStatus, errorThrown) {
			console.error(textStatus);
			console.error(errorThrown);
			cb(errorThrown, null);
		}
	});
}

function addTrack(product, cb) {
	var postdata = {url: product.product, vendorItemId: product.vendorItemId};
	$.ajax({
		url: "register/add", type: "POST", data: postdata,
		success: function(data, textStatus, jqXHR) {
			console.log(product.product + " added");
			console.log(data);
			cb(null, data);
		},
		error: function(jqXHR, textStatus, errorThrown) {
			console.error(textStatus);
			console.log(errorThrown);
			cb(errorThrown, null);
		}
	});
}

function removeProduct(productID, cb) {
	var postdata = {productID: productID};
	$.ajax({
		url: "register/remove", type: "POST", data: postdata,
		success: function(data, textStatus, jqXHR) {
			console.log(productID + " removed");
			console.log(data);
			cb(null, data);
		},
		error: function(jqXHR, textStatus, errorThrown) {
			console.error(textStatus);
			console.log(errorThrown);
			cb(errorThrown, null);
		}
	});
}

function getProductList(cb) {
	$.getJSON("register/list", function(data) {
		cb(data);
	});
}

function numberWithCommas(x) {
	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function exportHashToCSV(hash) {
	var keys = Object.keys(hash);
	var csv = "time, price\n";
	for (var i = 0; i < keys.length; i++) {
		var timestamp = new Date(parseInt(keys[i]));
		csv += timestamp + ", ";
		csv += hash[keys[i]] + "\n";
	}
	return csv;
}

function drawVisualization(history, productID) {
	var csvString = exportHashToCSV(history);
	// transform the CSV string into a 2-dimensional array
	var arrayData = $.csv.toArrays(csvString, {onParseValue: $.csv.hooks.castToScalar});
	//console.log(JSON.stringify(arrayData));
	// this new DataTable object holds all the data
	var data = new google.visualization.arrayToDataTable(arrayData);
	// CAPACITY - En-route ATFM delay - YY - CHART
	var thumbsStat = new google.visualization.ChartWrapper({
		chartType: 'LineChart',
		containerId: "chart-" + productID,
		dataTable: data,
		options:{
			//width: 800, height: 300,
			height: 200,
			//title: 'Price changes of ' + productID,
			//titleTextStyle : {color: 'grey', fontSize: 11},
			hAxis: {direction: 1},
			//curveType: "function",
			legend: {position: 'none'},
		}
	});
	thumbsStat.draw();
}

function getPriceHistory(productID) {
	$.getJSON("history/"+productID, function(data) {
		google.setOnLoadCallback(drawVisualization(data, productID));
	});
}

function createPane(item) {
	var content = document.getElementById("content");
	var productID = item.productID;
	var price = item.price;
	var pricediff = item.pricediff;
	if (!pricediff) pricediff = 0;
	if (parseInt(pricediff) > 0)
		pricediff = "+" + numberWithCommas(pricediff);
	else
		pricediff = numberWithCommas(pricediff);
	var isAvailable = "unknown";
	if (item.available == 0) {
		isAvailable = "판매중";
	} else if (item.available == 1) {
		isAvailable = "품절";
	} else if (item.available == 2) {
		isAvailable = "판매중지";
	}
	var delivery = "unknown";
	if (item.isRocket == true)
		delivery = "\<img src=\"images/rocket_logo.png\" width=56 height=14\>";
	else
		delivery = "일반배송";
	var pane = document.getElementById(productID);
	if (pane == undefined) {
		pane = document.createElement("div");
		pane.className = "col-6 col-sm-6 col-lg-4 col-xl-4";
		pane.id = productID;
		if (item.available != 0)
			pane.style.backgroundColor = "lightgray";
		pane.style.border = "thin solid #08FF00";
		var title = document.createElement("div");
		title.innerHTML = item.title;
		pane.appendChild(title);
		var pricepane = document.createElement("div");
		pricepane.id = "price-" + productID;
		pricepane.innerHTML = numberWithCommas(price) + "원 (" + pricediff + ") " + delivery;
		pane.appendChild(pricepane);
		var availpane = document.createElement("div");
		availpane.id = "avail-" + productID;
		availpane.innerHTML = isAvailable;
		pane.appendChild(availpane);
		var a = document.createElement("a");
		a.setAttribute("href", "https://www.coupang.com/vp/products/" + productID);
		a.setAttribute("target", productID);
		var imagediv = document.createElement("div");
		var img = document.createElement("IMG");
		img.src = item.image;
		img.width = "100";
		a.appendChild(img);
		imagediv.appendChild(a);
		pane.appendChild(imagediv);
		var chartPane = document.createElement("div");
		chartPane.id = "chart-" + productID;
		pane.appendChild(chartPane);

		var delbtn = document.createElement("BUTTON");
		delbtn.className = "btn btn-danger btn-sm";
		delbtn.type = "button";
		delbtn.id = "delbtn-" + productID;
		delbtn.innerHTML = "remove";
		delbtn.onclick = function() {
			var ID = this.id.split("delbtn-")[1];
			if (confirm("Wanna delete " + item.title + "?")) {
				removeProduct(ID, function(e, r) {
					if (e) {
						console.error(e);
						alert(e);
					} else {
						var p = document.getElementById(ID);
						p.parentNode.removeChild(p);
					}
				});
			}
		};
		pane.appendChild(delbtn);

		var notibtn = document.createElement("BUTTON");
		notibtn.className = "btn btn-info btn-sm";
		notibtn.type = "button";
		notibtn.id = "noti-" + productID;
		notibtn.onclick = function() {
			var ID = this.id.split("noti-")[1];
			var currStatus = this.innerHTML;
			var setNotiVal = false;
			var newStatus = "noti on";
			if (currStatus == "noti off") {
				setNotiVal = true;
				newStatus = "noti on";
			}
			setNoti(ID, setNotiVal, function(e, r) {
				if (e) {
				} else {
					var notiPane = document.getElementById("noti-" + productID);
					if (notiPane.innerHTML == "noti on")
						notiPane.innerHTML = "noti off";
					else
						notiPane.innerHTML = "noti on";
				}
			});
		}
		pane.appendChild(notibtn);

		content.appendChild(pane);
	} else {
		var pricepane = document.getElementById("price-" + productID);
		pricepane.innerHTML = numberWithCommas(price) + "원 (" + pricediff + ")";
		var availpane = document.getElementById("avail-" + productID);
		availpane.innerHTML = isAvailable;
		console.log(productID, "updated");
	}
	// Update Noti indicator
	getNoti(productID, function(r) {
		var notiPane = document.getElementById("noti-" + productID);
		var txt = "noti on";
		if (!r) txt = "noti off";
		notiPane.innerHTML = txt;
	});
}
