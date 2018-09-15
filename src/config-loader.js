//@ts-check
/// <reference path="./index.d.ts" />

const log = require('./log');
const path = require('path');
const fs = require('fs');

const FILENAME = 'config.json';
const FILE = path.join(__dirname, '..', FILENAME);

const TYPE_GITHUB = 'github';
const TYPE_GOGS = 'gogs';
const TYPE_BITBUCKET = 'bitbucket';

const validType = {
	[TYPE_GITHUB]: true,
	[TYPE_GOGS]: true,
	[TYPE_BITBUCKET]: true,
};
const defaultValues = {
	branch: 'master',
	remote: 'origin',
	type: "github",
	events: ['push'],
};

/** @type {Config} */
let config = null;

module.exports = {
	load,
	get,

	TYPE_GITHUB,
	TYPE_GOGS,
	TYPE_BITBUCKET,
};

function readConfig() {
	try {
		const content = fs.readFileSync(FILE, 'utf8');
		return JSON.parse(content);
	} catch (ex) {
		log.fatal(`Invalid config file "${FILENAME}"`, ex);
	}
}

function get() { return config; }


/**
 * @returns {Config}
 */
function load() {
	if (!fs.existsSync(FILE))
		log.fatal(`Could not open config file "${FILENAME}", please create it before use`);
	config = readConfig();

	const fatal = (why, reason = null) => log.fatal(`Invalid config: ${why}`, reason);

	if (typeof config != 'object')
		fatal('config is not an object');
	if (typeof config.port != 'number')
		fatal('port is not a number');

	if (typeof config.repositories != 'object')
		fatal('repositories is empty');

	let count = 0;
	Object.keys(config.repositories).forEach(repoName => {
		if (repoName.startsWith('// '))
			return log.info(`Ignore config: ${JSON.stringify(repoName)} (it be commented by "// ")`);

		/** @type {ConfigRepo} */
		const repo = config.repositories[repoName];
		const name = `repositories["${repoName}"]`;
		for (let key of ['local', 'secret'])
			if (typeof repo[key] != 'string')
				fatal(`${name}.${key} is not a string`);

		for (let key of ['branch', 'remote']) {
			if (!(key in repo))
				repo[key] = defaultValues[key];
			else if (typeof repo[key] != 'string')
				fatal(`${name}.${key} is not a string`);
		}

		if (!repo.type)
			repo.type = defaultValues.type;
		else if (!validType[repo.type])
			fatal(`${name}.type (${JSON.stringify(repo.type)}) is not a valid type`);

		if (!repo.events)
			repo.events = defaultValues.events.map(copy => copy);
		else if (!Array.isArray(repo.events))
			fatal(`${name}.events is not an array`);

		repo.events.forEach((event, i) => {
			if (typeof event != 'string')
				fatal(`${name}.events[${i}] is not a string`);
		});

		let existed = false;
		try {
			existed = fs.statSync(repo.local).isDirectory();
		} catch (ex) {
			fatal(`get stat of ${repo.local} failed!`, ex);
		}
		if (!existed)
			fatal(`"${repo.local}" is not a directory`);

		count++;
	});

	log.normal(`${count} configurations be loaded`);
	return config;
}


