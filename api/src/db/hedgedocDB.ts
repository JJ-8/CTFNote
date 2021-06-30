import { Connection, createConnections, getConnectionManager } from "typeorm";

export let hedgedocConnection: Connection;
export async function initdatabase(): Promise<void> {
	try {
		await createConnections();
	} catch (error) {
		console.error(error);
	}

	hedgedocConnection = getConnectionManager().get("hedgedoc");
}
