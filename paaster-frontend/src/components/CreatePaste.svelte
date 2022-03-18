<script lang="ts">
  import CryptoJS from 'crypto-js'
  import { acts } from '@tadashi/svelte-loading'
  import { navigate } from 'svelte-navigator'
  import { toast } from '@zerodevx/svelte-toast'

  import { filedrop } from 'filedrop-svelte'

  import { 
    getBackendSettings,
    savePaste,
  } from '../api'
  import { LocalPaste } from '../helpers/localPastes'

  let pastedCodePlain: string = ''
  async function codePasted(): Promise<void> {
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
      crypto.subtle.exportKey('jwk', key).then(async secret => {
        const clientSecretKey = secret.k
        const encryptedCode = CryptoJS.AES.encrypt(
          pastedCodePlain, clientSecretKey
        ).toString()

        const maxInBytes = backendSettings.maxPasteSizeMb * 1049000

        if (new Blob([encryptedCode]).size > maxInBytes) {
          pastedCodePlain = ''
          toast.push(`Paste larger then ${backendSettings.maxPasteSizeMb} MB(s)`)
          acts.show(false)
          return
        }

        try {
          const paste = await savePaste(encryptedCode)
          toast.push('Created paste!')

          new LocalPaste(paste.pasteId).setPaste({
            serverSecret: paste.serverSecret,
            pasteId: paste.pasteId,
            clientSecret: clientSecretKey,
            created: paste.created
          })

          navigate(`/${paste.pasteId}#${clientSecretKey}`)
        } catch (error) {
          pastedCodePlain = ''
          toast.push(error.toString())
        }

        acts.show(false)
      })
    })
  }

  async function onFileDrop(event: CustomEvent) {
    pastedCodePlain = await  event.detail.files.accepted[0].text()
    await codePasted()
  }
</script>

{#if pastedCodePlain === ''}
  <div use:filedrop={{fileLimit: 1, clickToUpload: false, windowDrop: true}} on:filedrop={async e => onFileDrop(e)}></div>

  <textarea
    bind:value={pastedCodePlain}
    placeholder="paste or drag & drop your code here"
    on:change={codePasted}
    on:input={codePasted}></textarea>
{:else}
  <textarea value={pastedCodePlain} disabled></textarea>
{/if}
