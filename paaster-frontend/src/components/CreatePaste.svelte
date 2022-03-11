<script lang="ts">
  import CryptoJS from 'crypto-js'
  import { acts } from '@tadashi/svelte-loading'
  import { navigate } from 'svelte-navigator'
  import { toast } from '@zerodevx/svelte-toast'

  import { getBackendSettings } from '../api/index'

  let pastedCodePlain: string = ''

  async function codePasted() {
    acts.show(true)

    const backendSettings = await getBackendSettings()

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

        const maxInBytes = backendSettings.maxPasteSizeMb * 1049000

        if (new Blob([encryptedCode]).size > maxInBytes) {
          pastedCodePlain = ''
          toast.push(`Paste larger then ${backendSettings.maxPasteSizeMb} MB(s)`)
          navigate('/')
          acts.show(false)
          return
        }

        const serverId = 'temp'
        const serverSecret = 'secret'

        localStorage.setItem(serverId, serverSecret)
        navigate(`/${serverId}#${clientSecretKey}`)

        acts.show(false)
      })
    })
  }pastedCodePlain
</script>

{#if pastedCodePlain === ''}
  <textarea
    bind:value={pastedCodePlain}
    placeholder="paste your code here"
    on:input={codePasted}></textarea>
{:else}
  <textarea value={pastedCodePlain} disabled></textarea>
{/if}
