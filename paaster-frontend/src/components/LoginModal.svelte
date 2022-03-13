<script lang="ts">
  import Fa from 'svelte-fa'
  import { faChevronRight } from '@fortawesome/free-solid-svg-icons'

  export let isOpen: boolean
  let createAccount = false
</script>

{#if isOpen}
  <div role="dialog" class="modal">
      <div class="contents">
        <div class="header">
          <h2>{#if !createAccount}Login{:else}Register{/if}</h2>
        </div>


        <form>
          <input type="text" placeholder="username">
          <input type="password" placeholder="password">
  
          <button type="submit" class="dark-button" style="margin-bottom: .5em;">
            <Fa icon={faChevronRight} />
            {#if !createAccount}login{:else}register{/if}
          </button>
        </form>
        <button on:click={() => createAccount = !createAccount}
          class="trans-button">
            {#if !createAccount}
              login with an existing account
            {:else}
              register an account
            {/if}
        </button>
      </div>
  </div>
{/if}
