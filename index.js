var net = require('net');
var uuid = require('uuid');

//var log = require('logger').create('RPC');
var log = {
	e: function(){
		console.log(arguments);
	}
}

var descrCmd = '__DESCR';
var resultCmd = '__RESULT';

var newLineCode = '\n'.charCodeAt(0);

exports = module.exports = light_rpc;

function light_rpc(wrapper){
    if(!(this instanceof light_rpc)) {
		return new light_rpc(wrapper);
	}

	this.wrapper = wrapper;
	this.description = {};
	this.callbacks = {};

	for(var p in wrapper){
		this.description[p] = {};
	}

	this.descrStr = command(descrCmd, this.description);
    return this;
}

function command(name, data){
	var cmd = {
		command: name,
		data: data
	};
	
	var cmdStr = JSON.stringify(cmd);
	return Buffer.byteLength(cmdStr) + '\n' + cmdStr;
}

light_rpc.prototype.connect = function(port, host, callback){
	if(!callback){
		callback = host;
		host = 'localhost';
	}

	var connection = new net.createConnection(port, host);
	var self = this;

	connection.on('connect', function(){
		connection.write(command(descrCmd));
	});

	var commandsCallback = function(cmd){
		if(cmd.command == resultCmd){
			if(self.callbacks[cmd.data.id]){
				self.callbacks[cmd.data.id].apply(this, cmd.data.args);
				delete self.callbacks[cmd.data.id];
			}
		} else if(cmd.command == descrCmd){
			var remoteObj = {};

			for(var p in cmd.data){
				remoteObj[p] = getRemoteCallFunction(p, self.callbacks, connection);
			}

			callback(remoteObj, connection);
		}
	}

	var lengthObj = {
		bufferBytes: undefined,
		getLength: true,
		length: -1
	}

	connection.on('data', getOnDataFn(commandsCallback, lengthObj));
	connection.on('error', function(err){
		log.e(err);
	});
}

function getOnDataFn(commandsCallback, lengthObj){
	return function(data){
		if(lengthObj.bufferBytes && lengthObj.bufferBytes.length > 0){
			var tmpBuff = new Buffer(lengthObj.bufferBytes.length + data.length);

			lengthObj.bufferBytes.copy(tmpBuff, 0);
			data.copy(tmpBuff, lengthObj.bufferBytes.length);
			
			lengthObj.bufferBytes = tmpBuff;
		} else {
			lengthObj.bufferBytes = data;
		}

		var commands = getComands.call(lengthObj);
		commands.forEach(commandsCallback);
	};
}

function getRemoteCallFunction(cmdName, callbacks, connection){
	return function(){
		var id = uuid.generate();

		if(typeof arguments[arguments.length-1] == 'function'){
			callbacks[id] = arguments[arguments.length-1];
		}		

		var args = parseArgumentsToArray.call(this, arguments);
		var newCmd = command(cmdName, {id: id, args: args});
		
		connection.write(newCmd);
	}
}

light_rpc.prototype.listen = function(port){
	var self = this;

	var server = net.createServer(function(c) {
		var commandsCallback = function(cmd){
			if(cmd.command == descrCmd){
					c.write(self.descrStr);
			}
			else if(!self.wrapper[cmd.command]){
				c.write(command('error', {code: 'UNKNOWN_COMMAND'}));
			}
			else {
				var args = cmd.data.args;
				args.push(getSendCommandBackFunction(c, cmd.data.id));

				self.wrapper[cmd.command].apply({}, args);
			}
		}

		var lengthObj = {
			bufferBytes: undefined,
			getLength: true,
			length: -1
		}

		c.on('data', getOnDataFn(commandsCallback, lengthObj));
		
		c.on('error', function(exception){
			log.e(exception);
		});
	});

	server.listen(port);
}

function getSendCommandBackFunction(connection, cmdId){
	return function(){
		var innerArgs = parseArgumentsToArray.call({}, arguments);
		var resultCommand = command(resultCmd, {id: cmdId, args: innerArgs});

		connection.write(resultCommand);
	};
}

function getComands(){
	var commands = [];
	var i = -1;

	var parseCommands = function(){
		if(this.getLength == true){
			i = getNewlineIndex(this.bufferBytes);
			if(i > -1){
				this.length = Number(this.bufferBytes.slice(0, i).toString());
				this.getLength = false;
				// (i + 1) for \n symbol
				this.bufferBytes = clearBuffer(this.bufferBytes, i + 1); 
			}
		}

		if(this.bufferBytes && this.bufferBytes.length >= this.length){
			var cmd = this.bufferBytes.slice(0, this.length).toString();
			this.getLength = true;

			try{
				var parsedCmd = JSON.parse(cmd);
			}
			catch(e){
				log.e('ERROR PARSE');
				log.e(cmd);
				log.e(this.length, this.bufferBytes.toString());
				return;
			}
			commands.push(parsedCmd);
			
			this.bufferBytes = clearBuffer(this.bufferBytes, this.length);

			if(this.bufferBytes && this.bufferBytes.length > 0){
				parseCommands.call(this);
			}
		}		
	}

	parseCommands.call(this);
	return commands;
}

function getNewlineIndex(buffer){
	if(buffer){
		for(var i = 0, l = buffer.length; i < l; ++i){
			if(buffer[i] == newLineCode){
				return i;
			}
		}
	}

	return -1;
}

function clearBuffer(buffer, length){
	if(buffer.length > length){
		return buffer.slice(length);
	}

	return undefined;
}

light_rpc.connect = function(){
    var rpc = light_rpc();
    return rpc.connect.apply(rpc, arguments);
}

function parseArgumentsToArray(){
	var args = [];
	
	for(var ar in arguments[0]){
		if(typeof arguments[0][ar] != 'function'){
			args.push(arguments[0][ar]);
		}
	}
	
	return args;
}