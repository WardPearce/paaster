import { MongoClient, type Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, afterEach, beforeAll } from 'vitest';

export function setupTestDb(): () => Db {
	let server: MongoMemoryServer | undefined;
	let client: MongoClient | undefined;
	let db: Db | undefined;

	beforeAll(async () => {
		server = await MongoMemoryServer.create();
		client = new MongoClient(server.getUri());
		await client.connect();
		db = client.db('paaster-test');
	});

	afterEach(async () => {
		if (db) {
			await db.dropDatabase();
		}
	});

	afterAll(async () => {
		await client?.close();
		if (server) {
			await server.stop();
		}
	});

	return () => {
		if (!db) {
			throw new Error('Test database not initialised');
		}
		return db;
	};
}