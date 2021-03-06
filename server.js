var security = require('./security');

var express = require('express');
var multer = require('multer');
var bodyParser = require('body-parser')
const cors = require('cors');
const fs = require('fs');

var uuid = require('uuid');

var app = express();
const port = 8081;

// enable cors
app.use(cors({
		origin: '*'
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// create application/json parser
var jsonParser = bodyParser.json();

const upload = multer({
	dest: 'C:\\upload'
});

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

async function query(sql, sqlData) {
  return new Promise((resolve, reject) => {
    con.query(sql, sqlData, function(err, results) {
      if(err) reject(err);
      resolve(results);
    });
  });
}

transaction = function(...funcs) {
	connection.beginTransaction(function(err) {
		if (err) { throw err; }
		var out = {};
		for(const f of funcs) {
			try {
				out = f(out);
			} catch (err) {
				// error detected, roll back
				connection.rollback(function() {
					throw err;
				});
			}
		}
		// all work successfull, commit txn!
		connection.commit(function(err) {
			if (err) {
				connection.rollback(function() {
					throw err;
				});
			}
			console.log('success!');
		});
	});
}

app.post('/api/upload', upload.array('images', 10), function(req, res) {
	console.log(req.files);
  if(req.files) {
		console.log('num images: ' + req.files.length);

		const uploadedFileNames = [];
		for(const image of req.files) {
			// generate unique guid filename
			var ext = getFileExtension(image.originalname);

			// rename file to include file extension
			const finalFilename = image.path + '.' + ext;
			fs.renameSync(image.path, finalFilename);

			uploadedFileNames.push(finalFilename);
		}

    // return generated filename to caller, indicating a successful upload
    res.send(uploadedFileNames);
  } else {
    res.status(500);
  }

});

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

async function switchSearch(queryObj) {
	// get list of allowable search fields
	const GET_SWITCH_TABLE_FIELDS
		= "SELECT column_name FROM information_schema.columns "
				+ " WHERE table_schema = 'switch' AND table_name = 'switch'";

	const tableColumns = await query(GET_SWITCH_TABLE_FIELDS);

	var allowedSearchFields = [];
	for(const column of tableColumns) {
		allowedSearchFields.push(column.column_name);
	}

	// execute search
	var searchData = [];
	var SEARCH_SQL
		= 'SELECT *'
				+ ' FROM switch.switch';

	var hasQueryParams = false;
	if(query) {
		// TODO change to more elegantly check if query params are present
		for(const queryField in queryObj) {
			hasQueryParams = true;
			break;
		}
	}

	if(hasQueryParams) {
		SEARCH_SQL += ' WHERE';
	}
	var AND = ' ';

	// filter search fields to only include fields present in the database
	for(const queryField in queryObj) {
		if(allowedSearchFields.includes(queryField)) {
			// TODO check for less/greater/not indicators - regex?
			var queryValue = queryObj[queryField];
			SEARCH_SQL += AND + queryField + ' = ?';
			AND = ' AND ';
			searchData.push(queryValue);
		}
	}

	const results = await query(SEARCH_SQL, searchData);
	var output = [];
	for(const result of results) {
		output.push(Object.assign({}, result));
	}
	return output;
}

async function loadSwitch(switchId) {
	const results = await switchSearch({ switch_id: switchId });
	if(!results || results.length == 0) {
		return undefined;
	}
	const loadedSwitch = results[0];

	// get images
	const GET_IMAGES_SQL
		= "SELECT file_name, is_primary, added_by FROM switch.image "
				+ " WHERE switch_id = ?";

	const images = await query(GET_IMAGES_SQL, [ switchId ]);

	loadedSwitch.images = [];
	for(const image of images) {
		loadedSwitch.images.push({
			file_name: image.file_name,
			is_primary: image.is_primary,
			added_by: image.added_by
		});
	}

	// get listings
	const GET_LISTINGS_SQL
		= "SELECT listing_id, url, price, added_by FROM switch.listing "
				+ " WHERE switch_id = ?"
				+ " ORDER BY price ASC";

	const listings = await query(GET_LISTINGS_SQL, [ switchId ]);

	loadedSwitch.listings = [];
	for(const listing of listings) {
		loadedSwitch.listings.push({
			listing_id: listing.listing_id,
			url: listing.url,
			price: listing.price,
			added_by: listing.added_by
		});
	}

	// TODO references

	return loadedSwitch;
}

app.get('/api/search', jsonParser, async (req, res) => {
	try {
		const results = await switchSearch(req.query);
		res.json(results);
	} catch (err) {
		console.log(err);
		res.sendStatus(500);
	}
});

async function getAutocompleteValues() {
	const GET_DISTINCT_QUERY
		= "SELECT DISTINCT manufacturer, name FROM switch.switch "
				+ " ORDER BY manufacturer, name";
	const rows = await query(GET_DISTINCT_QUERY);

	var result = {};
	var currentManu = null;
	for(const row of rows) {
		if(currentManu == null || currentManu != row.manufacturer) {
			currentManu = row.manufacturer;
			result[row.manufacturer] = [];
		}
		result[row.manufacturer].push(row.name);
	}

	return result;
}

app.get('/api/autocomplete', jsonParser, async (req, res) => {
	try {
		// manu -> name hierarchy
		const autocompleteData = await getAutocompleteValues();
		res.json(autocompleteData);
	} catch (err) {
		console.log(err);
		res.sendStatus(500);
	}
});

app.get('/api/switch/:switchId', async (req, res) => {
	try {
		// check for switch id param
		if(!req.params.switchId) {
			res.sendStatus(500);
			return;
		}
		const loadedSwitch = await loadSwitch(req.params.switchId);
		// check if a switch was found
		if(!loadedSwitch) {
			res.sendStatus(404);
		}
		res.json(loadedSwitch);
	} catch (err) {
		console.log(err);
		res.sendStatus(500);
	}
});

app.listen(port, () => {
	console.log(`Example app listening at http://localhost:${port}`)
		console.log(`Database config: ${security.SWITCH_DB_URL} - ${security.SWITCH_DB_USER}`)
});
