//@ts-check
/// <reference path="./index.d.ts" />

const fs = require('fs');
const path = require('path');
const log = require('./log');

const DUMP_REQUEST_DIR = path.join(__dirname, '..', 'logs');

module.exports = { dumpRequest };

let dumpLock = false;

function dumpRequest(queryStrings, headers, body) {
	if (dumpLock) return;
	dumpLock = true;

	try {
		if (!fs.existsSync(DUMP_REQUEST_DIR))
			fs.mkdirSync(DUMP_REQUEST_DIR);
		const targetFile = path.join(DUMP_REQUEST_DIR, `${new Date().toJSON()}.json`);
		fs.writeFileSync(targetFile, JSON.stringify({ queryStrings, headers, body }, null, '\t'));
		log.info(`dump request to log file: ${targetFile}`);
	} catch (ex) {
		log.warn('dump request to log file failed!');
	}

	dumpLock = false;
}
