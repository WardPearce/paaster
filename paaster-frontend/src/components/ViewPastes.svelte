<script lang="ts">
  import { storedPastes } from '../store'
  import type { iPasteStorage, iAccount } from '../helpers/interfaces'
  import { getAllPastesCredentials } from '../api'
  import { storedAccount } from '../store'
  import type { iEncryptedPaste } from '../api/interfaces'

  import { navigate } from 'svelte-navigator'
  import CryptoJS from 'crypto-js'

  let accountDetails: iAccount | null
  storedAccount.subscribe(value => {
    accountDetails = value
  })

  let accountPastes: iEncryptedPaste[] = []
  let LocalPastes: Record<string, iPasteStorage> | null = null
  if (!accountDetails) {
    storedPastes.subscribe(value => {
      LocalPastes = value
    })
  } else {
    getAllPastesCredentials().then(pastes => accountPastes = pastes)
  }

  function goToPaste(pasteId: string, pasteClientSecret: string) {
    if (!accountDetails) {
      navigate(`/${pasteId}#${pasteClientSecret}`)
    } else {
      const decryptedClientSecret = CryptoJS.AES.decrypt(
        pasteClientSecret, accountDetails.plainPassword
      ).toString(CryptoJS.enc.Utf8)

      navigate(`/${pasteId}#${decryptedClientSecret}`)
    }
  }
</script>

{#if LocalPastes}
  <div class="pastes">
    <ul>
      {#each Object.entries(LocalPastes) as [pasteId, paste]}
        <li>
          <div class="paste-item">
            <div class="paste-details">
              <div>
                <button on:click={() => goToPaste(pasteId, paste.clientSecret)}
                 class="trans-button">{ pasteId }</button>
              </div>
              <h3>{ new Date(paste.created * 1000).toUTCString() }</h3>
            </div>
          </div>
        </li>
      {/each}
    </ul>  
  </div>
{:else}
  <div class="pastes">
    <ul>
      {#each accountPastes as paste}
        <li>
          <div class="paste-item">
            <div class="paste-details">
              <div>
                <button on:click={() => goToPaste(paste.pasteId, paste.encryptedClientSecret)}
                class="trans-button">{ paste.pasteId }</button>
              </div>
            </div>
          </div>
        </li>
      {/each}
    </ul>  
  </div>
{/if}
