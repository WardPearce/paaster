<script lang="ts">
  import { storedPastes } from '../store'
  import type { iPasteStorage } from '../helpers/interfaces'
  import { friendlyTime } from '../helpers/time'

  import { navigate } from 'svelte-routing'

  let LocalPastes: iPasteStorage[]
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
      {#each LocalPastes.reverse() as paste}
        <li>
          <div class="paste-item">
            <div class="paste-details">
              <div>
                <button on:click={() => navigate(`/${paste.pasteId}#${paste.clientSecret}`)}
                  class="trans-button">{ paste.pasteId }</button>
              </div>
              <h4>{ friendlyTime(paste.created * 1000) }</h4>
            </div>
          </div>
        </li>
      {/each}
    </ul>  
  </div>
{/if}