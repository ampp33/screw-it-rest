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

getFileExtension = function(fileName) {
  var tokens = fileName.split('\.');
  return tokens[tokens.length - 1];
}

app.post('/api/switch', jsonParser, function(req, res) {
  console.log(req.body);
	const data = req.body;
  const switchData = data.switchData;
  const userId = data.userId;
	var switchId = switchData.switch_id;

	// TODO determine of user needs to have their stuff reviewed

  // TODO do all this in a transaction

  // pre-insert data cleanup
  if(switchData.is_silent) {
    if(switchData.is_silent === true) {
      switchData.is_silent = '1';
    } else {
      switchData.is_silent = '0';
    }
  } else {
    switchData.is_silent = '0';
  }

  if(!switchData.variant_num) {
    switchData.variant_num = 1;
  }

  switchData.version = 1;

  // TODO change to current user ID
  switchData.updated_by = 999;

	// create switch
	const INSERT_SWITCH_SQL
		= 'INSERT INTO switch.switch (switch_id, variant_num, name, series, manufacturer,'
			+ ' type, mount, top_material, bottom_material, stem_material, top_color,'
			+ ' bottom_color, stem_color, actuation_weight, bottom_out_weight, pre_travel,'
			+ ' total_travel, is_silent, updated_by, updated_ts, version, is_pending_review)'
			+ ' VALUES'
			+ '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),?,?)';

	const switchValues = [
		switchData.switch_id,
		switchData.variant_num,
		switchData.name,
		switchData.series,
		switchData.manufacturer,
		switchData.type,
		switchData.mount,
		switchData.top_material,
		switchData.bottom_material,
		switchData.stem_material,
		switchData.top_color,
		switchData.bottom_color,
		switchData.stem_color,
		switchData.actuation_weight,
		switchData.bottom_out_weight,
		switchData.pre_travel,
		switchData.total_travel,
		switchData.is_silent,
		switchData.updated_by,
		switchData.version,
		'0'
	];

	con.query(INSERT_SWITCH_SQL, switchValues, function(err, results) {
		if(err) {
			console.error(err);
			res.sendStatus(500);
			return;
		} else {
			if(!switchId) {
				switchId = results.insertId;
			}
		}

		// insert image(s)
		const INSERT_IMAGE_SQL
			= 'INSERT INTO switch.image (switch_id,file_name,is_primary,added_by,'
					+ ' added_ts,is_pending_review)'
					+ ' VALUES'
					+ ' (?,?,?,?,NOW(),?)';

		const imageValues = [];
		for(const image of switchData.images) {
      // generate guid for filename
      image.file_name = 'asdf' + '.' + getFileExtension(image.file_name);
      // TODO save file to filesystem!

      // TODO change added_by to have actual userId
      image.added_by = 999;

			imageValues.push(
				switchId,
				image.file_name,
				image.is_primary,
				image.added_by,
				'0'
			);
		}

		con.query(INSERT_IMAGE_SQL, imageValues, function(err, results) {
			if(err) {
				console.error(err);
				res.sendStatus(500);
				return;
			}

			// insert listing(s)
			const INSERT_LISTING_SQL
				= 'INSERT INTO switch.listing (url,price,switch_id,added_by,'
						+ ' added_ts,is_pending_review)'
						+ ' VALUES'
						+ ' (?,?,?,?,NOW(),?)';

			const listingValues = [];
			for(const listing of switchData.listings) {
        // TODO change added_by to have actual userId
        listing.added_by = 999;

				listingValues.push(
					listing.url,
					listing.price,
					switchId,
					listing.added_by,
					'0'
				);
			}

			con.query(INSERT_LISTING_SQL, listingValues, function(err, results) {
				if(err) {
					console.error(err);
					res.sendStatus(500);
					return;
				} else {

					// TODO add references
					// TODO add review entries if necessary
					// done?

				}
			});
		});
	});
});

getAllowedSwitchSearchFields = function(callback) {
	var switchTableFields = [];

	const GET_SWITCH_TABLE_FIELDS
		= "SELECT column_name FROM information_schema.columns "
				+ " WHERE table_schema = 'switch' AND table_name = 'switch'";

	con.query(GET_SWITCH_TABLE_FIELDS, function(err, results) {
		if(err) {
			console.error(err);
			res.sendStatus(500);
			return;
		} else {
			for(const result of results) {
				switchTableFields.push(result.column_name);
			}
			callback(switchTableFields);
		}
	});
}

app.get('/api/search', jsonParser, function(req, res) {
  const switchTableColumns = getAllowedSwitchSearchFields(function(allowedSearchFields) {
		// execute search
		var searchData = [];
		var SEARCH_SQL
			= 'SELECT *'
					+ ' FROM switch.switch';

    var hasQueryParams = false;
    if(req.query) {
      // TODO change to more elegantly check if query params are present
      for(const queryField in req.query) {
        hasQueryParams = true;
        break;
      }
		}

		if(hasQueryParams) {
			SEARCH_SQL += ' WHERE';
		}
		var AND = ' ';

		// filter search fields to only include fields present in the database
		for(const queryField in req.query) {
			if(allowedSearchFields.includes(queryField)) {
        // TODO check for less/greater/not indicators - regex?
        var queryValue = req.query[queryField];
				SEARCH_SQL += AND + queryField + ' = ?';
				AND = ' AND ';
				searchData.push(queryValue);
			}
		}

		con.query(SEARCH_SQL, searchData, function(err, results) {
			if(err) {
				console.error(err);
				res.sendStatus(500);
				return;
			} else {
				var output = [];
				for(const result of results) {
					output.push(Object.assign({}, result));
				}

				res.send(output);
			}
		});
	});
});

app.listen(port, () => {
	console.log(`Example app listening at http://localhost:${port}`)
    console.log(`Database config: ${security.SWITCH_DB_URL} - ${security.SWITCH_DB_USER}`)
});
