import { error } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';

export function stringToObjectId(id: string): ObjectId {
	let objectId: ObjectId;
	try {
		objectId = new ObjectId(id);
	} catch {
		throw error(400, 'Invalid ID');
	}

	return objectId;
}

export function parsePasteId(pasteId: string): ObjectId | string {
	return ObjectId.isValid(pasteId) ? new ObjectId(pasteId) : pasteId;
}
