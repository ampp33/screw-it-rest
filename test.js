var security = require('./security');
var mysql = require('mysql');

var con = mysql.createConnection({
	host: security.SWITCH_DB_URL,
	user: security.SWITCH_DB_USER,
	password: security.SWITCH_DB_PASS
});
con.connect();
