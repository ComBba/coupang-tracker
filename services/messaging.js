var config = require('config');
var axios = require('axios');

var endpoint = config.get("messaging.endpoint");
var oauth = config.get("messaging.oauth");
var oauthUser = config.get("messaging.user");
var token = config.get("messaging.token");
var botname = config.get("messaging.botname");

function sendTelegram(msg) {
	axios({
		method: "post",
		headers:{
			"oauth": oauth,
			"id": oauthUser,
			"token": token
		},
		url: endpoint,
		data: {
			name: botname,
			message: msg,
			type: "temporal",
			disablenoti: false
		}
	});
}
module.exports.sendTelegram = sendTelegram;
