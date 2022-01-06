var security = require('./security');
var mysql = require('mysql');

var con = mysql.createConnection({
	host: security.SWITCH_DB_URL,
	user: security.SWITCH_DB_USER,
	password: security.SWITCH_DB_PASS
});
con.connect();

async function query(sql, sqlData) {
  return new Promise((resolve, reject) => {
    con.query(sql, sqlData, function(err, results) {
      if(err) reject(err);
      resolve(results);
    });
  });
}

async function doAsyncStuff() {
	console.log('async shit complete!');
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

async function doItAll() {
	const results = await query('select * from switch.switch');
	console.log(results);
	await doAsyncStuff();
	console.log('done!');
}


doItAll();
