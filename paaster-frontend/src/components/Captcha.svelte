<script lang="ts">
  import Fa from 'svelte-fa'
  import { faArrowRotateRight } from '@fortawesome/free-solid-svg-icons'

  import { createEventDispatcher } from 'svelte'

  import { backendUrl } from '../api'

  const dispatch = createEventDispatcher()

  let captchaImage: string = ''

  function getCaptchaImg(): void {
    fetch(`${backendUrl}/api/captcha`, {
      method: 'GET'
    }).then(resp => {
      resp.json().then(json => {
        dispatch('captcha', {
          captchaSigning: json.captchaSigning
        })
        captchaImage = json.imageData
      })
    })
  }

  getCaptchaImg()
</script>

<div class="captcha">
  <img src={captchaImage} alt="Captcha">
  <button class="dark-button" type="button" on:click={getCaptchaImg}>
    <Fa icon={faArrowRotateRight} />
  </button>
</div>
<input type="text" placeholder="captcha">
