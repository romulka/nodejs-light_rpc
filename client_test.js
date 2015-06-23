'use strict';

var rpc = require('./index.js');
var step = require('step');

var total = 0;
var intervalId;

var started = 0;
var finished = 0;

function next(){
	if(total > 100){
		clearInterval(intervalId);
		console.log('end');
		console.log('res', started, '->', finished);
		return;
	}

	console.log('next', total);
	total++;

	step(
		function(){
			for(var p = 0; p < 100; ++p){
				rpc.connect(6556, 'localhost', function(remote, conn){
					started++;
					remote.combine(1, 2, function(res){
						if(res !== 3){
							console.log('Achtung!!! ---------', res);
						}

						remote.getFile(function(ires){
							var l = JSON.stringify(ires).length;

							if(l !== 21){
								console.log(l, 'TT_TT, Achtung');
							}

							finished++;

							if(finished === started){
								console.log('res', started, '->', finished);
							}

							conn.destroy();
							conn.end();
						});
					});
				});
			}
		});
}

intervalId = setInterval(next, 1000);

//rpc.connect(6556, 'localhost', function(remote, conn){
//	remote.combine(1, 2, function(res){
//		console.log(res)
//		remote.getFile(function(res2){
//			console.log(res2);
//			conn.destroy();
//			conn.end();
//		});
//	});
//});
