var http = require('http');
var express = require('express');
var path = require('path');

FileDriver = require('./fileDriver').FileDriver;
MongoClient = require('mongodb').MongoClient;
Server = require('mongodb').Server;
CollectionDriver = require('./collectionDriver').CollectionDriver;

var app = express();
app.set('port',process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(express.bodyParser());

var mongoHost = 'localHost';
var mongoPort = 27017; 
var fileDriver;
var collectionDriver;
 
var mongoClient = new MongoClient(new Server(mongoHost, mongoPort)); 
mongoClient.open(function(err, mongoClient) {
	if (!mongoClient) {
	    console.error("Error! Exiting... Must start MongoDB first");
	    process.exit(1);
	}
	var db = mongoClient.db("MyDatabase");
	fileDriver = new FileDriver(db);
	collectionDriver = new CollectionDriver(db);
    });


app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
	res.send('<html><body><h1></h1></body></html>');
    });
 
app.post('/files', function(req,res) {fileDriver.handleUploadRequest(req,res);});

app.get('/files/:id', function(req, res) {fileDriver.handleGet(req,res);});

/*
app.get('/:collection', function(req, res) { //A
	var params = req.params; //B
	collectionDriver.findAll(req.params.collection, function(error, objs) { //C
		if (error) { res.send(400, error); } //D
		else { 
		    if (req.accepts('html')) { //E
			res.render('data',{objects: objs, collection: req.params.collection}); //F
		    } else {
			res.set('Content-Type','application/json'); //G
			res.send(200, objs); //H
		    }
		}
	    });
    });
*/

app.get('/:collection', function(req, res, next) {  
	var params = req.params;

	//HTTP queries can be added to the end of a URL in the form http://domain/endpoint?key1=value1&key2=value2.... req.query gets the whole “query” part of the incoming URL. For this application the key is “query” (hence req.query.query)
	var query = req.query.query; //1
	if (query) {
	    //The query value should be a string representing a MongoDB condition object. JSON.parse() turns the JSON-string into a javascript object that can be passed directly to MongoDB.
	    query = JSON.parse(query); //2
	    //If a query was supplied to the endpoint, call collectionDriver.query()returnCollectionResults is a common helper function that formats the output of the request.
	    collectionDriver.query(req.params.collection, query, returnCollectionResults(req,res)); //3
	} else {
	    //If no query was specified, then collectionDriver.findAll returns all the items in the collection.
	    collectionDriver.findAll(req.params.collection, returnCollectionResults(req,res)); //4
	}
    });
 
function returnCollectionResults(req, res) {
    //Since returnCollectionResults() is evaluated at the time it is called, this function returns a callback function for the collection driver.
    return function(error, objs) { //5
        if (error) { res.send(400, error); }
	else { 
	    //If the request specified HTML for the response, then render the data table in HTML; otherwise return it as a JSON document in the body.
	    if (req.accepts('html')) { //6
		res.render('data',{objects: objs, collection: req.params.collection});
	    } else {
		res.set('Content-Type','application/json');
		res.send(200, objs);
	    }
        }
    };
};


app.get('/:collection/:entity', function(req, res) { //I
	var params = req.params;
	var entity = params.entity;
	var collection = params.collection;
	if (entity) {
	    collectionDriver.get(collection, entity, function(error, objs) { //J
		    if (error) { res.send(400, error); }
		    else { res.send(200, objs); } //K
		});
	} else {
	    res.send(400, {error: 'bad url', url: req.url});
	}
    });

app.post('/:collection', function(req, res) { //A
	var object = req.body;
	var collection = req.params.collection;
	collectionDriver.save(collection, object, function(err,docs) {
		if (err) { res.send(400, err); } 
		else { res.send(201, docs); } //B
	    });
    });

app.put('/:collection/:entity', function(req, res) { //A
	var params = req.params;
	var entity = params.entity;
	var collection = params.collection;
	if (entity) {
	    collectionDriver.update(collection, req.body, entity, function(error, objs) { //B
		    if (error) { res.send(400, error); }
		    else { res.send(200, objs); } //C
		});
	} else {
	    var error = { "message" : "Cannot PUT a whole collection" };
	    res.send(400, error);
	}
    });

app.delete('/:collection/:entity', function(req, res) { //A
	var params = req.params;
	var entity = params.entity;
	var collection = params.collection;
	if (entity) {
	    collectionDriver.delete(collection, entity, function(error, objs) { //B
		    if (error) { res.send(400, error); }
		    else { res.send(200, objs); } //C 200 b/c includes the original doc
		});
	} else {
	    var error = { "message" : "Cannot DELETE a whole collection" };
	    res.send(400, error);
	}
    });


http.createServer(app).listen(app.get('port'), function() {
	console.log('Express server listening on port' + app.get('port'));
    });