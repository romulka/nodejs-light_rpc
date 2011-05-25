var rpc = require('./index.js');
var Step = require('step');

var total = 0;
var intervalId = undefined;

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

	Step(
		function(){
			for(var p = 0; p < 100; ++p){
				rpc.connect(5556, 'localhost', function(remote, conn){
					started++;
					remote.combine(1, 2, function(res){
						if(res != 3){
							console.log('Achtung!!! ---------', res);
						}
						
						remote.getFile(function(res){
							var l = JSON.stringify(res).length

							if(97143 != l){
								console.log(l, 'TT_TT, Achtung')
							}
							finished++;

							if(finished == started){
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

//rpc.connect(5556, 'localhost', function(remote, conn){
//	remote.combine(1, 2, function(res){
//		console.log(res)
//		remote.getFile(function(res2){
//			console.log(res2);
//			conn.destroy();
//			conn.end();
//		});
//	});
//});