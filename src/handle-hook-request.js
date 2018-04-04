//@ts-check

let log = require('./log'),
	config = require('./config'),
	crypto = require('crypto'),
	path = require('path'),
	{ exec } = require('child_process');

const GIT = path.join(__dirname, 'git.sh');

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
function verify(actual, rawBody, secret) {
	let expected = 'sha1=' + crypto.createHmac('sha1', secret).update(rawBody).digest('hex');
	return Buffer.from(expected).equals(Buffer.from(actual));
}

/**
 * @param {{[name: string]: string|string[]}} headers
 * @param {Buffer} body
 * @returns {Promise<{status: number; message: string}>}
 */
function handle(headers, body) {

	let signature = String(headers['x-hub-signature']),
		event = String(headers['x-github-event']),
		delivery = String(headers['x-github-delivery']);

	if (!signature)
		return invalidRequest('header X-Hub-Signature is empty');
	if (!event)
		return invalidRequest('header X-Github-Event is empty');
	if (!delivery)
		return invalidRequest('header X-Github-Delivery is empty');

	/** @type {GithubResponse} */
	let response = safeParseJson(body);
	if (!response)
		return invalidRequest('invalid request body (it is not a json)');

	if (!response.repository)
		return invalidRequest('invalid request body (empty `repository`)');
	if (typeof response.repository.full_name != 'string')
		return invalidRequest('invalid request body (`repository.full_name` is not a string)');

	let repoName = response.repository.full_name;

	let repositories = config.get().repositories;
	if (!(repoName in repositories))
		return invalidRequest(`"${repoName}" is not defined in config`);

	let repoConfig = repositories[repoName],
		secret = repoConfig.secret;

	let verified = verify(signature, body, secret);
	if (!verified)
		return invalidRequest(`invalid signature!`);

	let headCommit = 'Unknown head commit';
	if (response.head_commit) {
		let head = response.head_commit;
		headCommit = `${head.id.slice(0, 7)} ${JSON.stringify(head.message.split('\n')[0])}`;
	}
	log.info(`received verified hook request: ${event} ${repoName} (${headCommit})`);

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
				return resolve({ status: 500, message: 'git pull failed!'});
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

function safeParseJson(json) { try { return JSON.parse(json); } catch (ex) { } }
