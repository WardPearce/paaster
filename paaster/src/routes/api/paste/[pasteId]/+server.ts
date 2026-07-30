import { validateAuth } from '$lib/server/auth';
import { stringToObjectId } from '$lib/server/objectId';
import { error, json } from '@sveltejs/kit';
import argon2 from 'argon2';
import { z } from 'zod';

export async function DELETE({ locals, request, params }) {
	const pasteId = stringToObjectId(params.pasteId);

	const paste = await locals.mongoDb.collection('pastes').findOne({
		_id: pasteId
	});
	if (!paste) {
		throw error(404, 'Paste not found');
	}

	await validateAuth(request.headers.get('Authorization'), paste.accessKey);

	await locals.mongoDb.collection('pastes').deleteOne({ _id: paste._id });
	if (locals.userId) {
		await locals.mongoDb.collection('userPastes').deleteOne({
			userId: locals.userId,
			'paste.id': params.pasteId
		});
	}
	await locals.storageBackend.deletePaste(paste._id.toString());

	return json({});
}

const updatePasteSchema = z.object({
	codeName: z.string().trim().max(64).optional(),
	codeNameNonce: z.string().trim().max(64).optional(),
	codeNameKeySalt: z.string().trim().max(64).optional(),
	langName: z.string().trim().max(64).optional(),
	langNonce: z.string().trim().max(64).optional(),
	langKeySalt: z.string().trim().max(64).optional(),
	expireAfter: z
		.string()
		.refine((val) => !isNaN(Number(val)), { message: 'Must be a valid number' })
		.transform((val) => Number(val))
		.optional(),
	wrapWords: z
		.string()
		.toLowerCase()
		.refine((val) => val == 'true' || val === 'false', { message: 'Must be a boolean' })
		.transform((val) => val === 'true')
		.optional(),
	passphrase: z.string().trim().max(255).optional()
});

export async function POST({ locals, request, params, cookies }) {
	const pasteId = stringToObjectId(params.pasteId);

	const paste = await locals.mongoDb.collection('pastes').findOne({
		_id: pasteId
	});
	if (!paste) {
		throw error(404, 'Paste not found');
	}

	await validateAuth(request.headers.get('Authorization'), paste.accessKey);

	const toUpdate: Record<string, string | number | boolean | Record<string, string | number>> = {};

	const formData = updatePasteSchema.safeParse(Object.fromEntries(await request.formData()));

	if (!formData.success) {
		throw error(400, formData.error);
	}

	if (formData.data.codeName && formData.data.codeNameNonce && formData.data.codeNameKeySalt) {
		toUpdate.name = {
			value: formData.data.codeName,
			nonce: formData.data.codeNameNonce,
			keySalt: formData.data.codeNameKeySalt
		};
	}

	if (formData.data.langName && formData.data.langNonce && formData.data.langKeySalt) {
		toUpdate.language = {
			value: formData.data.langName,
			nonce: formData.data.langNonce,
			keySalt: formData.data.langKeySalt
		};
	}

	if (typeof formData.data.expireAfter !== 'undefined') {
		if (formData.data.expireAfter <= 2192 && formData.data.expireAfter >= -2) {
			toUpdate.expireAfter = formData.data.expireAfter;
		}
	}

	if (typeof formData.data.wrapWords !== 'undefined') {
		toUpdate.wrapWords = formData.data.wrapWords;
	}

	const toUnset: Record<string, string> = {};

	if (typeof formData.data.passphrase !== 'undefined') {
		if (formData.data.passphrase === '') {
			toUnset.passphrase = '';
			cookies.delete('passphrase_' + params.pasteId, { path: '/' });
		} else {
			if (formData.data.passphrase.length < 8) {
				throw error(400, 'Passphrase must be at least 8 characters');
			}
			toUpdate.passphrase = await argon2.hash(formData.data.passphrase);
		}
	}

	const updateOp: Record<string, Record<string, unknown>> = { $set: toUpdate };
	if (Object.keys(toUnset).length > 0) {
		updateOp.$unset = toUnset;
	}

	await locals.mongoDb.collection('pastes').updateOne({ _id: pasteId }, updateOp);

	return json({});
}
