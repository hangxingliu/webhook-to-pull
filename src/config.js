//@ts-check
/// <reference path="./index.d.ts" />

let log = require('./log'),
	path = require('path'),
	fs = require('fs');

const FILENAME = 'config.json';
const FILE = path.join(__dirname, '..', FILENAME);
module.exports = { load };

function readConfig() {
	try {
		let content = fs.readFileSync(FILE, 'utf8');
		return JSON.parse(content);
	} catch (ex) {
		log.fatal(`Invalid config file "${FILENAME}"`, ex);
	}
}

/**
 * @returns {Config}
 */
function load() {
	if (!fs.existsSync(FILE))
		log.fatal(`Could not open config file "${FILENAME}", please create it before use`);
	let config = readConfig();

	if (typeof config != 'object')
		log.fatal(`Invalid config: not an object`);
	if (typeof config.port != 'number')
		log.fatal(`Invalid config: port is not a number`);

	if (!Array.isArray(config.repositories))
		log.fatal(`Invalid config: repositories is not an array`);

	config.repositories.forEach(
		/** @param {ConfigRepo} repo */
		function (repo, i) {
			let name = `repositories[${i}]`;
			for (let key of ['repo', 'local', 'secert', 'branch', 'remote'])
				if (typeof repo[key] != 'string')
					log.fatal(`Invalid config: ${name}.${key} is not a string`);

			if (!Array.isArray(repo.events))
				log.fatal(`Invalid config: ${name}.events is not an array`);

			repo.events.forEach((event, i) => {
				if (typeof event != 'string')
					log.fatal(`Invalid config: ${name}.events[${i}] is not a string`);
			});

			let existed = false;
			try {
				existed = fs.statSync(repo.local).isDirectory();
			} catch (ex) {
				log.fatal(`Invalid config: get stat of ${name}.local failed!`, ex);
			}
			if (!existed)
				log.fatal(`Invalid config: "${repo.local}" is not a directory`);
		});

	return config;
}


