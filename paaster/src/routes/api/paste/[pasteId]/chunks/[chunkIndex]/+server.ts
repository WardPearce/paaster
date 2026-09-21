import { error } from '@sveltejs/kit';
import type { PasteDoc } from '$lib/server/pastes';
import { parsePasteId } from '$lib/server/objectId';

export async function GET({ locals, params }) {
	const paste = await locals.mongoDb.collection<PasteDoc>('pastes').findOne({
		_id: parsePasteId(params.pasteId)
	});
	if (!paste) {
		throw error(404, 'Paste not found');
	}

	const chunkIndex = parseInt(params.chunkIndex, 10);
	if (isNaN(chunkIndex) || chunkIndex < 0) {
		throw error(400, 'Invalid chunkIndex');
	}

	const data = await locals.storageBackend.getChunk(params.pasteId, chunkIndex);
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
