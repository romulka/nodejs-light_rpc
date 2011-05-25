Simple RPC server/client based on NodeJS native 'net' lib sockets. 

Tested with nodejs >= 0.4.2

Sample server looks like:

	var light_rpc = require('./index.js');
	var port = 5556;

	var rpc = new light_rpc({
		combine: function(a, b, callback){
			callback(a + b);
		},
		multiply: function(t, cb){
			cb(t*2);
		}
	});
	rpc.listen(port);


Sample client:

	rpc.connect(5556, 'localhost', function(remote, conn){
		remote.combine(1, 2, function(res){
			if(res != 3){
				console.log('ERROR', res);
			}

			conn.destroy();
			conn.end();
		});
	});
