//@ts-check
/// <reference path="./index.d.ts" />

const log = require('./log');
const path = require('path');
const fs = require('fs');

const DEFAULT_FILE = path.join(__dirname, '..', 'config.json');

const TYPE_GITHUB = 'github';
const TYPE_GITLAB = 'gitlab';
const TYPE_GOGS = 'gogs';
const TYPE_BITBUCKET = 'bitbucket';
const TYPE_CODING_NET = 'coding.net';
const TYPE_GITEE_COM = 'gitee.com';
const TYPE_GITEA = 'gitea';

const isValidTypes = {
	[TYPE_GITHUB]: true,
	[TYPE_GITLAB]: true,
	[TYPE_GOGS]: true,
	[TYPE_BITBUCKET]: true,
	[TYPE_CODING_NET]: true,
	[TYPE_GITEE_COM]: true,
	[TYPE_GITEA]: true,
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
	TYPE_CODING_NET,
	TYPE_GITEE_COM,
	TYPE_GITEA,
	TYPE_GITLAB,
};

/** @param {string} configFile */
function readConfig(configFile) {
	try {
		const content = fs.readFileSync(configFile, 'utf8');
		return JSON.parse(content);
	} catch (ex) {
		log.fatal(`Invalid config file "${configFile}"`, ex);
	}
}

function get() { return config; }


/**
 * @returns {Config}
 */
function load(configFile = DEFAULT_FILE) {
	if (!fs.existsSync(configFile))
		log.fatal(`Could not open config file "${configFile}", please create it before use`);
	config = readConfig(configFile);

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

		for (let key of ['branch', 'remote', 'afterPull']) {
			if (!(key in repo))
				repo[key] = defaultValues[key];
			else if (typeof repo[key] != 'string')
				fatal(`${name}.${key} is not a string`);
		}

		if ('async' in repo && typeof repo.async != 'boolean')
			fatal(`${name}.async is not a boolean`);

		if (!repo.type)
			repo.type = defaultValues.type;
		else if (!isValidTypes[repo.type])
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


