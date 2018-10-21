//@ts-check
/// <reference path="./index.d.ts" />

const crypto = require('crypto');

module.exports = {
	github,
	gogs,
	bitbucket_gitee_gitea_gitlab,
};

/** @type {VerifyFunction} */
function github(actual, rawBody, secret) {
	let expected = 'sha1=' + crypto.createHmac('sha1', secret).update(rawBody).digest('hex');
	return Buffer.from(expected).equals(Buffer.from(actual));
}

/** @type {VerifyFunction} */
function gogs(actual, rawBody, secret) {
	let expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
	return Buffer.from(expected).equals(Buffer.from(actual));
}

/** @type {VerifyFunction} */
function bitbucket_gitee_gitea_gitlab(actual, rawBody, secret) {
	return String(secret) === String(actual);
}
