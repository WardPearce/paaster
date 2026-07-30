import { stringToObjectId } from '$lib/server/objectId';
import { error } from '@sveltejs/kit';

export async function GET({ locals, params }) {
	const pasteId = params.pasteId;
	const objectId = stringToObjectId(pasteId);

	const paste = await locals.mongoDb.collection('pastes').findOne({ _id: objectId });
	if (!paste) {
		throw error(404, 'Paste not found');
	}

	const chunkIndex = parseInt(params.chunkIndex, 10);
	if (isNaN(chunkIndex) || chunkIndex < 0) {
		throw error(400, 'Invalid chunkIndex');
	}

	const data = await locals.storageBackend.getChunk(pasteId, chunkIndex);
	if (!data) {
		throw error(404, 'Chunk not found');
	}

	return new Response(new Blob([Buffer.from(data)]), {
		headers: {
			'Content-Type': 'application/octet-stream',
			'Content-Length': data.byteLength.toString()
		}
	});
}
