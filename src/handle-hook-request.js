//@ts-check

const log = require('./log');
const config = require('./config-loader');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const GIT = path.join(__dirname, 'git.sh');

/** @type {{[x: string]: {signature: string; event: string; delivery: string;}}} */
const HEADER_NAMES = {
	github: {
		signature: 'x-hub-signature',
		event: 'x-github-event',
		delivery: 'x-github-delivery',
	},
	gogs: {
		signature: 'x-gogs-signature',
		event: 'x-gogs-event',
		delivery: 'x-gogs-delivery',
	}
};

module.exports = { handle };

/** @param {string[]} strings */
function escapedShellString(strings) {
	return strings.map(str => "'" + str.replace(/'/g, "'\\''") + "'");
}

/**
 * @param {string} actual
 * @param {Buffer} rawBody
 * @param {string} secret
 */
function verifyGithub(actual, rawBody, secret) {
	let expected = 'sha1=' + crypto.createHmac('sha1', secret).update(rawBody).digest('hex');
	return Buffer.from(expected).equals(Buffer.from(actual));
}

/**
 * @param {string} actual
 * @param {Buffer} rawBody
 * @param {string} secret
 */
function verifyGogs(actual, rawBody, secret) {
	let expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
	return Buffer.from(expected).equals(Buffer.from(actual));
}

/**
 * @param {{[name: string]: string|string[]}} headers
 * @param {Buffer} body
 * @returns {Promise<{status: number; message: string}>}
 */
function handle(headers, body) {
	/** @type {GithubResponse} */
	let requestBody = safeParseJson(body);
	if (config.get().dump)
		dumpLogs(headers, requestBody);
	if (!requestBody)
		return invalidRequest('invalid request body (it is not a json)');

	if (!requestBody.repository)
		return invalidRequest('invalid request body (empty `repository`)');

	const repoName = requestBody.repository.full_name;
	if (typeof requestBody.repository.full_name != 'string')
		return invalidRequest('invalid request body (`repository.full_name` is not a string)');

	const repositories = config.get().repositories;
	if (!Object.prototype.hasOwnProperty.call(repositories, repoName))
		return invalidRequest(`"${repoName}" is not defined in config`);

	const repoConfig = repositories[repoName];
	const { secret, type } = repoConfig;
	const headerNames = HEADER_NAMES[type];

	const signature = String(headers[headerNames.signature]);
	const event = String(headers[headerNames.event]);
	const delivery = String(headers[headerNames.delivery]);

	if (!signature)
		return invalidRequest(`header ${headerNames.signature} is empty`);
	if (!event)
		return invalidRequest(`header ${headerNames.event} is empty`);
	if (!delivery)
		return invalidRequest(`header ${headerNames.delivery} is empty`);

	let verifyMethod = verifyGithub;
	if (type === config.TYPE_GOGS) verifyMethod = verifyGogs;

	let verified = verifyMethod(signature, body, secret);
	if (!verified)
		return invalidRequest(`invalid signature!`);

	let headCommit = 'Unknown head commit';
	if (requestBody.head_commit) {
		let head = requestBody.head_commit;
		headCommit = `${head.id.slice(0, 7)} ${JSON.stringify(head.message.split('\n')[0])}`;
	}
	log.info(`received verified hook request: ${event} ${repoName} (${headCommit})`);
	log.info(`webhook delivery id: ${delivery}`);

	if (repoConfig.events.indexOf(event) < 0) {
		log.warn(`ignore this event, because it is not included in ${JSON.stringify(repoConfig.events)}`);
		return Promise.resolve({ status: 200, message: "ok! (but ignored this event)" });
	}

	log.info(`git pulling in ${repoConfig.local} ...`);
	return gitPull(repoConfig);
}

/** @param {ConfigRepo} repoConfig */
function gitPull(repoConfig) {
	let cmd = 'bash ' + escapedShellString([
		GIT, 'pull',
		repoConfig.local, repoConfig.remote, repoConfig.branch]).join(' ');
	return new Promise((resolve) => {
		exec(cmd, (error, stdout, stderr) => {
			if (error) {
				log.error(`git pull failed!`, error);
				('stdout:\n' + String(stdout) + '\nstderr:\n' + String(stderr))
					.split('\n').forEach(line => log.error(line));
				return resolve({ status: 500, message: 'git pull failed!' });
			}

			let headCommitMtx = String(stdout).match(/HEAD_COMMIT=(\w+)/);
			let headCommit = headCommitMtx ? headCommitMtx[1] : 'Unknown';
			log.info(`git pull done! (head commit hash: ${headCommit}  repo: ${repoConfig.local})`);
			return resolve({ status: 200, message: `ok! (local HEAD: ${headCommit})` });
		});
	});
}

function invalidRequest(message = 'Bad Request') {
	log.warn(`Invalid request: ${message}`);
	return Promise.resolve({ status: 400, message });
}

function safeParseJson(json) {
	try {
		return JSON.parse(json);
	} catch (ex) {
		log.warn(`Exception be thrown in safeParseJson `);
	}
}

let dumpLogsLock = false;
function dumpLogs(headers, body) {
	if (dumpLogsLock) return;
	dumpLogsLock = true;

	const DIR = path.join(__dirname, '..', 'logs');
	try {
		if (!fs.existsSync(DIR))
			fs.mkdirSync(DIR);
		const targetFile = path.join(DIR, `${new Date().toJSON()}.json`);
		fs.writeFileSync(targetFile, JSON.stringify({ headers, body }, null, '\t'));
		log.info(`dump request to log file: ${targetFile}`);
	} catch (ex) {
		log.warn('dump request to log file failed!');
	}

	dumpLogsLock = false;
}
