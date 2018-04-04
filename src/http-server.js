//@ts-check

let log = require('./log');
let http = require('http');

module.exports = { listen };

/**
 * @param {any} app
 * @param {number} port
 */
function listen(app, port) {
	let server = http.createServer(app);

	server.listen(port);
	server.on('error', onError);
	server.on('listening', onListening);

	function onError(error) {
		if (error.syscall !== 'listen') {
			throw error;
		}

		var bind = typeof port === 'string' ?
			'Pipe ' + port :
			'Port ' + port;

		// handle specific listen errors with friendly messages
		switch (error.code) {
			case 'EACCES':
				log.fatal(bind + ' requires elevated privileges');
				break;
			case 'EADDRINUSE':
				log.fatal(bind + ' is already in use');
				break;
			default:
				throw error;
		}
	}

	function onListening() {
		var addr = server.address();
		var bind = typeof addr === 'string' ?
			'pipe ' + addr :
			'port ' + addr.port;

		log.normal('Server listening on ' + bind);
	}
}


