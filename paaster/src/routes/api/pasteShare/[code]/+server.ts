import { error, json } from '@sveltejs/kit';
import { deletePasteShareSession, getPasteShareSession } from '$lib/server/pasteShare';

export async function GET({ locals, params }) {
	const session = await getPasteShareSession(locals.mongoDb, params.code);
	if (!session) throw error(404);

	const status = session.cipher ? 'completed' : session.receiverPublicKey ? 'awaiting' : 'pending';

	return json({
		status,
		receiverPublicKey: session.receiverPublicKey
	});
}

export async function DELETE({ locals, params }) {
	await deletePasteShareSession(locals.mongoDb, params.code);

	return new Response();
}
