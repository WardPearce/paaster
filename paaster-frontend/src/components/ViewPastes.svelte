<script lang="ts">
  import { storedPastes } from '../store'
  import type { iPasteStorage } from '../helpers/interfaces'

  import { Link } from 'svelte-navigator'

  let pastes: Record<string, iPasteStorage> = {}
  storedPastes.subscribe(value => {
    pastes = value
  })
</script>

<div class="pastes">
  <ul>
    {#each Object.entries(pastes) as [pasteId, paste]}
      <li>
        <div class="paste-item">
          <div class="paste-details">
            <div>
              <Link to={`/${pasteId}#${paste.clientSecret}`}>{ pasteId }</Link>
              <p style="font-size: .8em;">Stored locally</p>
            </div>
            <h3>{ new Date(paste.created * 1000).toUTCString() }</h3>
          </div>
        </div>
      </li>
    {/each}
  </ul>  
</div>
