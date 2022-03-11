<script lang="ts">
  import CryptoJS from 'crypto-js'

  let pastedCode: string = ''

  function codePasted() {
    window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256
      },
      true,
      ["encrypt", "decrypt"]
    ).then(key => {
      crypto.subtle.exportKey('jwk', key).then(secret => {
        const encryptedCode = CryptoJS.AES.encrypt(
          pastedCode, secret.k
        ).toString()

        console.log(encryptedCode)
      })
    })
  }
</script>

<textarea
  bind:value={pastedCode}
  placeholder="paste your code here"
  on:input={codePasted}></textarea>
