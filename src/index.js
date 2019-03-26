//@ts-check

const express = require('express');
const log = require('./log');
const config = require('./config-loader').load();
const server = require('./http-server');

const bodyParser = require('body-parser');
const hookRequest = require('./handle-hook-request');

if (process.argv.indexOf('test') >= 2) {
	log.info('The configuration looks good!');
	process.exit(0);
}

const app = express();

app.use(require('morgan')('dev'));

app.get('/', (req, res) => resposneStatusJson(res, { status: 200, message: 'OK!' }));
app.get('/hook', (req, res) => resposneStatusJson(res, { status: 405, message: '405 Method Not Allowed' }));

app.use(bodyParser.raw({ inflate: true, limit: '128kb', type: 'application/*' }));
app.post('/hook', (req, res) => {
	hookRequest.handle(req.query, req.headers, req.body)
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
	void (next);
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
