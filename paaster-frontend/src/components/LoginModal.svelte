<script lang="ts">
  import Fa from 'svelte-fa'
  import { faChevronRight } from '@fortawesome/free-solid-svg-icons'

  import zxcvbn from 'zxcvbn'

  import Captcha from './Captcha.svelte'

  export let isOpen: boolean

  let createAccount = false
  let username = ''
  let plainPassword = ''

  let paswsordCrackTime = ''
  let passwordStrengh = 0

  function passwordFeedback() {
    if (!createAccount)
      return

    const zx = zxcvbn(plainPassword)

    paswsordCrackTime = zx.crack_times_display.offline_slow_hashing_1e4_per_second
    passwordStrengh = zx.score
  }
</script>

{#if isOpen}
  <div role="dialog" class="modal">
      <div class="contents">
        <div class="header">
          <h2>{#if !createAccount}Login{:else}Register{/if}</h2>
        </div>

        <form>
          <input bind:value={username} type="text" placeholder="username">
          <input bind:value={plainPassword} on:input={passwordFeedback}
           type="password" placeholder="password">
          {#if createAccount && paswsordCrackTime}
            <p class="pass-feedback">
              This password would take { paswsordCrackTime } to guess
            </p>
            <progress value="{passwordStrengh}" max="4"></progress>
          {/if}

          {#if !createAccount || passwordStrengh > 1}
            <Captcha />
            <button type="submit" class="dark-button" style="margin-bottom: .5em;">
              <Fa icon={faChevronRight} />
              {#if !createAccount}login{:else}register{/if}
            </button>
          {:else}
            <button type="submit" class="dark-button" disabled style="margin-bottom: .5em;">
              stronger password required
            </button>
          {/if}
        </form>
        <button on:click={() => createAccount = !createAccount}
          class="trans-button">
            {#if createAccount}
              login with an existing account
            {:else}
              register an account
            {/if}
        </button>
      </div>
  </div>
{/if}
