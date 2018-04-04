//@ts-check

let express = require('express'),
	log = require('./log')	,
	config = require('./config').load(),
	server = require('./http-server');

let bodyParser = require('body-parser'),
	hookRequest = require('./handle-hook-request');

let app = express();

app.use(require('morgan')('dev'));

app.use(bodyParser.raw({ inflate: true, limit: '64kb', type: 'application/*' }));
app.post('/hook', (req, res) => {
	hookRequest.handle(req.headers, req.body)
		.then(result => resposneStatusJson(res, result))
		.catch(error => {
			resposneStatusJson(res, { status: 500, message: '500 Internal Server Error' });
			log.error(`Unhandled error:`, error);
		});
});

app.use((req, res) => resposneStatusJson(res, { status: 404, message: `404 Not Found` }));
app.use((err, req, res, next) => {
	resposneStatusJson(res, { status: 500, message: `500 Internal Server Error` });
	log.error(`Unhandled error:`, err);
});

server.listen(app, config.port);

/**
 * @param {{status: Function, json: Function}} response
 * @param {{status: number; message: string}} json
 */
function resposneStatusJson(response, json) {
	response.status(json.status);
	response.json(json);
}
