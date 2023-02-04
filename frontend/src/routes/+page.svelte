<script lang="ts">
	import sodium from 'libsodium-wrappers';
	import { acts } from '@tadashi/svelte-loading';

	let isLoading = false;

	async function pasteSubmit(event: Event & { data: string }) {
		isLoading = true;
		acts.show(true);

		await sodium.ready;

		const rawKey = sodium.crypto_secretbox_keygen();
		const rawIv = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);

		const cipherArray = sodium.crypto_secretbox_easy(
			new TextEncoder().encode(event.data),
			rawIv,
			rawKey
		);
		const rawUrlSafeKey = sodium.to_base64(rawKey, sodium.base64_variants.URLSAFE_NO_PADDING);

		isLoading = false;
		acts.show(false);
	}
</script>

<main>
	<textarea
		on:input={pasteSubmit}
		placeholder="paste or drag & drop your code here"
		name="create-paste"
		disabled={isLoading}
	/>

	<section>
		<h3>how we protect your privacy.</h3>
		<p>
			Paaster utilizes end-to-end encryption for storing and sharing pastes, meaning even the server
			can't view what you save here.
		</p>
		<p>
			Our source code is completely open source and can be reviewed on <a
				href="https://github.com/WardPearce/paaster"
				referrerpolicy="no-referrer">Github</a
			>.
		</p>
	</section>
</main>
