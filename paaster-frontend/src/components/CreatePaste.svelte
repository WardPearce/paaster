<script lang="ts">
  import forge from 'node-forge'
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
    if (!pastedCodePlain) {
      // On Chrome & Safari 'on:input' isn't called if a value is binded
      // Could use 'on:change' for for Chrome but doesn't work for Safari.
      // This hackie way lets paaster work for all major browsers.

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      pastedCodePlain = document.getElementById('pastedCode').value
    }

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

        const salt = forge.random.getBytesSync(128)
        const iv = forge.random.getBytesSync(16)

        const key = forge.pkcs5.pbkdf2(
          clientSecretKey, salt, 50000, 32
        )
        const cipher = forge.cipher.createCipher('AES-CBC', key)
        cipher.start({iv: iv})
        cipher.update(forge.util.createBuffer(pastedCodePlain))
        cipher.finish()

        const encryptedCode = cipher.output.toHex()

        const maxInBytes = backendSettings.maxPasteSizeMb * 1049000

        if (new Blob([encryptedCode]).size > maxInBytes) {
          pastedCodePlain = ''
          toast.push(`Paste larger then ${backendSettings.maxPasteSizeMb} MB(s)`)
          acts.show(false)
          return
        }

        try {
          const paste = await savePaste(
            encryptedCode,
            forge.util.bytesToHex(iv),
            forge.util.bytesToHex(salt)
          )
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
    placeholder="paste or drag & drop your code here"
    id="pastedCode"
    on:input={codePasted}></textarea>
{:else}
  <textarea value={pastedCodePlain} disabled></textarea>
{/if}
