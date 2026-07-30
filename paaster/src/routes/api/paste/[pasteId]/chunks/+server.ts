import { stringToObjectId } from '$lib/server/objectId';
import { getMaxUploadBytes } from '$lib/server/storage';
import { error, json } from '@sveltejs/kit';
import { z } from 'zod';

const chunkSchema = z.object({
	chunkIndex: z.string().transform((v) => parseInt(v, 10)).pipe(z.number().int().nonnegative()),
	totalChunks: z.string().transform((v) => parseInt(v, 10)).pipe(z.number().int().min(1)),
	data: z.instanceof(File)
}).refine((v) => v.chunkIndex < v.totalChunks, {
	message: 'chunkIndex must be less than totalChunks'
});

export async function POST({ locals, params, request }) {
	const pasteId = params.pasteId;
	const objectId = stringToObjectId(pasteId);

	const paste = await locals.mongoDb.collection('pastes').findOne({ _id: objectId });
	if (!paste) {
		throw error(404, 'Paste not found');
	}

	const formData = Object.fromEntries(await request.formData());
	const parsed = chunkSchema.safeParse(formData);

	if (!parsed.success) {
		throw error(400, parsed.error);
	}

	const { chunkIndex, totalChunks, data: file } = parsed.data;
	const maxBytes = getMaxUploadBytes();

	const buf = await file.arrayBuffer();
	if (buf.byteLength > maxBytes) {
		throw error(413, 'Chunk exceeds maximum upload size');
	}

	await locals.storageBackend.saveChunk(pasteId, chunkIndex, new Uint8Array(buf), totalChunks);

	if (chunkIndex === totalChunks - 1) {
		await locals.mongoDb.collection('pastes').updateOne(
			{ _id: objectId },
			{ $set: { totalChunks } }
		);
	}

	return json({});
}
