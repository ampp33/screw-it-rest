var security = require('./security');
var mysql = require('mysql');

var con = mysql.createConnection({
	host: security.SWITCH_DB_URL,
	user: security.SWITCH_DB_USER,
	password: security.SWITCH_DB_PASS
});
con.connect();

query = function(sql, sqlData, data, handler) {
  return new Promise((resolve, reject) => {
    con.query(sql, sqlData, function(err, results) {
      if(err) reject(err);
      handler(data, results);
      resolve();
    });
  });
}

transaction = function(...queries) {
  connection.beginTransaction(function(err) {
		if (err) throw err;
		var out = {};
    Promise
    .all(queries)
    .then(() => {
      // commit
      connection.commit(function(err) {
        if(err) throw err;
  			console.log('success!');
  		});
    })
    .catch((e) => {
      // rollback
      connection.rollback(function() {
        throw err;
      });
    });
  });
}

var blah = {};
transaction(query("sql", [], blah, function() {

}));
