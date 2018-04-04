//@ts-check

let log = require('./log'),
	config = require('./config'),
	crypto = require('crypto');

module.exports = { handle };

function sign(data) {
	// return 'sha1=' + crypto.createHmac('sha1', options.secret).update(data).digest('hex')
}

/**
 * @param {{[name: string]: string|string[]}} headers
 * @param {Buffer} body
 * @returns {Promise<{status: number; message: string}>}
 */
function handle(headers, body) {

	console.log(JSON.stringify(headers, null, '\t'));
	console.log(body.toString('utf8'));

	let signature = String(headers['x-hub-signature']),
		event = String(headers['x-github-event']),
		delivery = String(headers['x-github-delivery']);

	if (!signature)
		return invalidRequest('header X-Hub-Signature is empty');
	if (!event)
		return invalidRequest('header X-Github-Event is empty');
	if (!delivery)
		return invalidRequest('header X-Github-Delivery is empty');



	return Promise.resolve({ status: 200, message: "ok" });
}

function invalidRequest(message = 'Bad Request') {
	log.warn(`Invalid request: ${message}`);
	return Promise.resolve({ status: 400, message });
}
