import { makeWrapResolversPlugin, gql } from "graphile-utils";
import axios from "axios";
import querystring from "querystring";
import { hedgedocConnection, initdatabase } from "../db/hedgedocDB";
import scrypt, { ScryptParams } from "scrypt-kdf";

class HedgedocAuth {
	public static async constructEmail(username: string) {
		let domain: string;

		const base = await this.baseUrl();

		if (base == null) {
			domain = `localhost.local`;
		} else {
			const url = new URL(base);

			//if domain does not end in '.[tld]', it will be rejected
			//so we add '.local' manually
			if (url.hostname.split(".").length == 1) {
				domain = `${url.hostname}.local`;
			} else {
				domain = url.hostname;
			}
		}
		return `${username}@${domain}`;
	}

	private static async baseUrl(): Promise<string | null> {
		let cleanUrl: string =
			process.env.CREATE_PAD_URL || "http://hedgedoc:3000/new";
		cleanUrl = cleanUrl.slice(0, -4); //remove '/new' for clean url
		return cleanUrl;
	}

	private static async authPad(
		username: string,
		password: string,
		url: URL
	): Promise<string> {
		const email = await HedgedocAuth.constructEmail(username);
		try {
			const res = await axios.post(
				url.toString(),
				querystring.stringify({
					email: email,
					password: password,
				}),
				{
					validateStatus: (status) => status === 302,
					maxRedirects: 0,
					timeout: 5000,
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
					},
				}
			);
			return res.headers["set-cookie"][0];
		} catch (e) {
			console.error(e);
			return "";
		}
	}

	static async register(username: string, password: string): Promise<string> {
		const authUrl = new URL(`${await this.baseUrl()}/register`);
		return this.authPad(username, password, authUrl);
	}

	static async verifyLogin(cookie: string) {
		const url = new URL(`${await this.baseUrl()}/me`);

		try {
			const res = await axios.get(url.toString(), {
				validateStatus: (status) => status === 200,
				maxRedirects: 0,
				timeout: 5000,
				headers: {
					Cookie: cookie,
				},
			});

			return res.data.status == "ok";
		} catch (e) {
			return false;
		}
	}

	static async login(username: string, password: string): Promise<string> {
		const authUrl = new URL(`${await this.baseUrl()}/login`);
		const result = await this.authPad(username, password, authUrl);
		const success = await this.verifyLogin(result);
		if (!success) {
			//create account for existing users that are not registered to Hedgedoc
			await this.register(username, password);
			return this.authPad(username, password, authUrl);
		} else {
			return result;
		}
	}
}

const profileNameById = async function (context: any, id: number) {
	const { pgClient } = context;
	const {
		rows: [r],
	} = await pgClient.query(
		`SELECT username FROM ctfnote.profile WHERE id = $1;`,
		[id]
	);
	return r.username;
};

export default makeWrapResolversPlugin({
	Mutation: {
		login: {
			async resolve(
				resolve: any,
				_source,
				args,
				context: any,
				_resolveInfo
			) {
				const result = await resolve();
				context.setHeader(
					"set-cookie",
					await HedgedocAuth.login(
						await profileNameById(context, result.data.user_id),
						args.input.password
					)
				);
				return result;
			},
		},
		register: {
			async resolve(
				resolve: any,
				_source,
				args,
				context: any,
				_resolveInfo
			) {
				const result = await resolve();
				await HedgedocAuth.register(
					args.input.login,
					args.input.password
				);
				context.setHeader(
					"set-cookie",
					await HedgedocAuth.login(
						args.input.login,
						args.input.password
					)
				);
				return result;
			},
		},
		registerWithToken: {
			async resolve(
				resolve: any,
				_source,
				args,
				context: any,
				_resolveInfo
			) {
				const result = await resolve();
				await HedgedocAuth.register(
					args.input.login,
					args.input.password
				);
				context.setHeader(
					"set-cookie",
					await HedgedocAuth.login(
						args.input.login,
						args.input.password
					)
				);
				return result;
			},
		},
		resetPassword: {
			async resolve(
				resolve: any,
				_source,
				args,
				context: any,
				_resolveInfo
			) {
				const result = await resolve();
				await initdatabase();

				//get hedgedoc email
				const hedgedocEmail = await HedgedocAuth.constructEmail(
					await profileNameById(context, result.data.user_id)
				);

				//get new hedgedoc password
				const hedgedocPasswordBuf = await scrypt.kdf(
					args.input.password,
					{
						logN: 15,
					} as ScryptParams
				);
				const hedgedocPassword = hedgedocPasswordBuf.toString("hex");

				//update hegdedoc database
				try {
					await hedgedocConnection.query(
						'UPDATE "Users" SET password = $2 WHERE email = $1',
						[hedgedocEmail, hedgedocPassword]
					);
				} catch (error) {
					console.error(error);
				}

				return result;
			},
		},
		updateProfile: {
			async resolve(
				resolve: any,
				_source,
				args,
				context: any,
				_resolveInfo
			) {
				//first get the current name
				const { pgClient } = context;
				const {
					rows: [r],
				} = await pgClient.query(
					`SELECT username FROM ctfnote.profile WHERE id = $1;`,
					[args.input.id]
				);
				const hedgedocEmailOld = await HedgedocAuth.constructEmail(
					r.username
				);

				//then update the username
				const result = await resolve();

				await initdatabase();

				//get the new username
				const hedgedocEmailNew = await HedgedocAuth.constructEmail(
					args.input.patch.username
				);

				//update hegdedoc database
				try {
					await hedgedocConnection.query(
						'UPDATE "Users" SET email = $2 WHERE email = $1',
						[hedgedocEmailOld, hedgedocEmailNew]
					);
				} catch (error) {
					console.error(error);
				}

				return result;
			},
		},
		deleteUser: {
			async resolve(
				resolve: any,
				_source,
				args,
				context: any,
				_resolveInfo
			) {
				//first get the current name
				const { pgClient } = context;
				const {
					rows: [r],
				} = await pgClient.query(
					`SELECT username FROM ctfnote.profile WHERE id = $1;`,
					[args.input.userId]
				);
				const hedgedocEmailOld = await HedgedocAuth.constructEmail(
					r.username
				);

				const result = await resolve();

				await initdatabase();
				//update hegdedoc database
				try {
					await hedgedocConnection.query(
						'DELETE FROM "Users" WHERE email = $1',
						[hedgedocEmailOld]
					);
				} catch (error) {
					console.error(error);
				}

				return result;
			},
		},
	},
});
