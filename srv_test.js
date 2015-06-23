'use strict';

var LightRPC = require('./index.js');

var file = {test: 'testObject'};
var port = 6556;

var rpc = new LightRPC({
	combine: function(a, b, callback){
		callback(a + b);
	},
	multiply: function(t, cb){
		cb(t * 2);
	},
	getFile: function(cb){
		cb(file);
	}
});

rpc.listen(port);
