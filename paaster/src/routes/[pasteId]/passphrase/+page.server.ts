import { error, fail } from '@sveltejs/kit';
import { stringToObjectId } from '$lib/server/objectId';

export async function load({ params, locals }) {
	const paste = await locals.mongoDb.collection('pastes').findOne({ _id: stringToObjectId(params.pasteId) });
	if (!paste) throw error(404, 'Paste not found');
	return { pasteId: params.pasteId };
}

export const actions = {
	default: async ({ request, params, cookies, url }) => {
		const formData = await request.formData();
		const passphrase = formData.get('passphrase') as string;

		if (!passphrase) {
			return fail(400, { error: 'Passphrase is required', missing: true });
		}

		cookies.set('passphrase_' + params.pasteId, passphrase, {
			httpOnly: true,
			sameSite: 'lax',
			path: '/',
			maxAge: 82800,
			secure: url.protocol === 'https:'
		});

		return { success: true };
	}
};
