type Config = {
	port: number;
	repositories: { [name: string]: ConfigRepo };
};

type ConfigRepo = {
	local: string;
	secret: string;
	branch: string;
	remote: string;
	events: string[];
};

type GithubResponse = {
	head_commit?: {
		id: string;
		message: string;
	};

	repository: {
		full_name: string
	};
};
