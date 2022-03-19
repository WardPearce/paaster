<script lang="ts">
  import { storedPastes } from '../store'
  import type { iPasteStorage } from '../helpers/interfaces'

  import { navigate } from 'svelte-navigator'

  let LocalPastes: Record<string, iPasteStorage>
  storedPastes.subscribe(value => {
    LocalPastes = value
  })

  if (!LocalPastes) {
    navigate('/')
  }
</script>

{#if LocalPastes}
  <div class="pastes">
    <ul>
      {#each Object.entries(LocalPastes).reverse() as [pasteId, paste]}
        <li>
          <div class="paste-item">
            <div class="paste-details">
              <div>
                <button on:click={() => navigate(`/${pasteId}#${paste.clientSecret}`)}
                  class="trans-button">{ pasteId }</button>
              </div>
              <h4>{ new Date(paste.created * 1000).toLocaleDateString() }</h4>
            </div>
          </div>
        </li>
      {/each}
    </ul>  
  </div>
{/if}