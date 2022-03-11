<script lang="ts">
  import CryptoJS from 'crypto-js'
  import { Loading, acts } from '@tadashi/svelte-loading'
  import { navigate } from 'svelte-navigator'

  let pastedCodePlain: string = ''

  function codePasted() {
    acts.show(true)

    crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    ).then(key => {
      crypto.subtle.exportKey('jwk', key).then(secret => {
        const clientSecretKey = secret.k
        const encryptedCode = CryptoJS.AES.encrypt(
          pastedCodePlain, clientSecretKey
        ).toString()

        const serverId = 'temp'
        const serverSecret = 'secret'

        localStorage.setItem(serverId, serverSecret)
        navigate(`/${serverId}#${clientSecretKey}`)

        acts.show(false)
      })
    })
  }
</script>

<Loading />

{#if pastedCodePlain === ''}
  <textarea
    bind:value={pastedCodePlain}
    placeholder="paste your code here"
    on:input={codePasted}></textarea>
{:else}
  <textarea value={pastedCodePlain} disabled></textarea>
{/if}
