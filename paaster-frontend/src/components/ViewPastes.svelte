<script lang="ts">
  import { storedPastes } from '../store'
  import type { iPasteStorage } from '../helpers/interfaces'

  import { navigate } from 'svelte-navigator'

  let LocalPastes: Record<string, iPasteStorage> | null = null
  storedPastes.subscribe(value => {
    LocalPastes = value
  })
</script>

<div class="pastes">
  <ul>
    {#each Object.entries(LocalPastes) as [pasteId, paste]}
      <li>
        <div class="paste-item">
          <div class="paste-details">
            <div>
              <button on:click={() => navigate(`/${pasteId}#${paste.clientSecret}`)}
                class="trans-button">{ pasteId }</button>
            </div>
            <h3>{ new Date(paste.created * 1000).toUTCString() }</h3>
          </div>
        </div>
      </li>
    {/each}
  </ul>  
</div>
