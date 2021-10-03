var security = require('./security');

var express = require('express');
var bodyParser = require('body-parser')
const cors = require('cors');


var app = express();
const port = 8081;

app.use(cors({
    origin: '*'
}));

// create application/json parser
var jsonParser = bodyParser.json()

var mysql = require('mysql');
var con = mysql.createConnection({
  host: security.SWITCH_DB_URL,
  user: security.SWITCH_DB_USER,
  password: security.SWITCH_DB_PASS
});
con.connect();

getSwitchFields = function(callback) {
	const SQL = 'SELECT c.categoryid, c.name AS "category_name", f.fieldid,'
								+ ' f.name as "field_name", f.type, f.json'
								+ ' FROM switch.category c'
								+ ' JOIN switch.field_category fc ON fc.categoryid = c.categoryid'
								+ ' JOIN switch.field f on f.fieldid = fc.fieldid'
								+ ' ORDER BY c.category_order, fc.field_order';

	con.query(SQL, function(error, results, fields) {
		var json = [];
		var currentCategoryObj;
		for(var i = 0; i < results.length; i++) {
			var result = results[i];
			if(!currentCategoryObj || result.category_name != currentCategoryObj.name) {
				currentCategoryObj = {
						id: result.categoryid,
						name: result.category_name,
						fields: []
				};
				json.push(currentCategoryObj);
			}

			var field = {
				id: result.fieldid,
				name: result.field_name,
				type: result.type,
			};

			if(result.json) {
				var additionalFields = JSON.parse(result.json);
				Object.assign(field, additionalFields);
			}
			currentCategoryObj.fields.push(field);
		}

		// return results to REST caller
		callback(json);
	});
}

findSwitchesWithData = function(switchId = null, searchFields = [], callback) {
	var whereClause = '';
	var preparedValues = [];

	// compile where clause if search fields are provided
	if(searchFields && searchFields.length > 0) {
		var comma = '';
		const inSet = '(?, ?)';
		// NOTE: first addition to WHERE statement, so add 'WHERE' no matter what
		whereClause += ' WHERE s.switch_id IN ('
		+ ' SELECT switch_id FROM switch.value v2'
		+ ' JOIN switch.field f2 ON f2.fieldid = v2.field_id'
		+ ' WHERE (f2.name, v2.value) IN (';

		searchFields.forEach(searchField => {
			whereClause += comma;
			whereClause += inSet;
			comma = ",";
			preparedValues.push(searchField.name, searchField.value);
		});
		whereClause += ") GROUP BY s.switch_id HAVING COUNT(1) = ? )";
		preparedValues.push(searchFields.length);
	}

	if(switchId) {
		if(whereClause.length == 0) {
			// add 'WHERE' because no where clause has been identified yet
			whereClause += ' WHERE';
		} else {
			// where clause already exists, add a condition to it
			whereClause += ' AND';
		}
		whereClause += ' s.switch_id = ?';
		preparedValues.push(switchId);
	}

	const SQL = 'SELECT v.switch_id, v.field_id, v.value'
							+ ' FROM switch.switch s'
							+ ' JOIN switch.value v ON v.switch_id = s.switch_id'
							+ whereClause;

	con.query(SQL, preparedValues, function(error, results, fields) {
		var switchesWithData = [];
		var currentSwitch;
		for(var i = 0; i < results.length; i++) {
			var result = results[i];

			if(!currentSwitch || result.switch_id != currentSwitch.switch_id) {
				currentSwitch = {
					switch_id: result.switch_id,
					fields: []
				};
				switchesWithData.push(currentSwitch);
			}

			currentSwitch.fields.push({
				field_id: result.field_id,
				value: result.value
			});
		}

		// return results to REST caller
		callback(switchesWithData);
	});
}

app.get('/api/switch-fields', function (req, res) {
	getSwitchFields(function(json) {
		res.send(json);
	});
});

app.put('/api/switch', jsonParser, function(req, res) {
	const switchData = JSON.parse(req.body.switchData);
	const userId = 999;

	// create switch
	const INSERT_SWITCH_SQL = 'INSERT INTO switch.switch (created_by, created_ts) VALUES (?, NOW())';
	con.query(INSERT_SWITCH_SQL, [userId], function(err, results) {
		if(err) {
			console.error(err);
			res.sendStatus(500);
			return;
		} else {
			const switchId = results.insertId;

			// insert switch values
			const INSERT_SWITCH_DATA_SQL = 'INSERT INTO switch.value (switch_id, field_id, value) VALUES ?';

			var batchValues = [];
			switchData.forEach(function(category){
				category.fields.forEach(function(field) {
					batchValues.push([
						switchId,
						field.id,
						field.value
					]);
				});
			});

			con.query(INSERT_SWITCH_DATA_SQL, [batchValues], function(err) {
				if(err) {
					console.error(err);
					res.sendStatus(500);
				} else {
					res.sendStatus(200);
				}
			});
		}
	});
});

app.get('/api/switch', jsonParser, function(req, res) {
	getSwitchFields(function(json) {
		// have all switch fields, so update their values with the switch's data
	});
});

app.get('/api/search', jsonParser, function(req, res) {
	// grab search fields from request, if present
	var searchSwitchId = null;
	const searchFields = [];
	if(req.query) {
		if(req.query.switch_id) {
			searchSwitchId = req.query.switch_id;
		}
		if(req.query.search_fields) {
			searchFields = JSON.parse(req.query.search_fields);
		}
	}
	// retrieve template for switch data (category, field name, type, etc)
	getSwitchFields(function(switchCategories) {
		// perform switch search
		findSwitchesWithData(searchSwitchId, searchFields, function(switchesWithData) {
			var responseSwitchList = [];
			// loop through each switch and push its data onto the template,
			// then push the result object onto the response list
			for(const switchWithData of switchesWithData) {
				// make a copy of the switch template
				var copiedSwitchCategories = JSON.parse(JSON.stringify(switchCategories));
				// create a new switch object to return in the response
				var responseSwitch = {
					switch_id: switchWithData.switch_id,
					switchCategories: copiedSwitchCategories
				};
				responseSwitchList.push(responseSwitch);

				// loop through each field in the switch template and find the matching
				// field in the switch data, then copy the switch field value into the
				// template
				for(const category of copiedSwitchCategories) {
					for(const field of category.fields) {
						var fieldWithData = switchWithData.fields.find(switchField => switchField.field_id === field.id);
						if(fieldWithData) {
							field.value = fieldWithData.value;
							continue;
						}
					}
				}
			}

			// done, return results!
			res.send(responseSwitchList);
		});
	});
});

app.listen(port, () => {
	console.log(`Example app listening at http://localhost:${port}`)
    console.log(`Database config: ${security.SWITCH_DB_URL} - ${security.SWITCH_DB_USER}`)
});
