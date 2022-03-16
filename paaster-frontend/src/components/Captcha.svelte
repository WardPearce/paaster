<script lang="ts">
  import Fa from 'svelte-fa'
  import { faArrowRotateRight, faChevronRight } from '@fortawesome/free-solid-svg-icons'

  import { createEventDispatcher } from 'svelte'

  import { backendUrl } from '../api'

  const dispatch = createEventDispatcher()

  let captchaImage: string = ''

  export let showingCaptcha = false
  export let userCaptchaInput: string = ''

  function captchaSubmited(): void {
    dispatch('captchaSubmited')
  }

  export function generateCaptcha(): void {
    fetch(`${backendUrl}/api/captcha`, {
      method: 'GET'
    }).then(resp => {
      resp.json().then(json => {
        dispatch('captchaGenerated', {
          captchaSigning: json.captchaSigning
        })
        captchaImage = json.imageData
      })
    })
  }

  export function displayCaptcha(show = true): void {
    if (show) {
      generateCaptcha()
    } else {
      userCaptchaInput = ''
    }
    showingCaptcha = show
  }
</script>

{#if showingCaptcha}
<form on:submit|preventDefault={captchaSubmited}>
  <div class="captcha">
    <img src={captchaImage} alt="Captcha">
    <button class="dark-button" type="button" on:click={generateCaptcha}>
      <Fa icon={faArrowRotateRight} />
    </button>
  </div>
  <input bind:value={userCaptchaInput} type="text" placeholder="captcha">
  <button type="submit" class="dark-button" style="margin-bottom: .5em;">
    <Fa icon={faChevronRight} />
    captcha completed
  </button>
</form>
{/if}
