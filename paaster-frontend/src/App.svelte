<script lang="ts">
  import Fa from 'svelte-fa'
  import { 
    faLock, faChevronRight, faClipboard,
    faUser
  } from '@fortawesome/free-solid-svg-icons'

  import { Route, Router, Link } from 'svelte-navigator'

  import { Loading } from '@tadashi/svelte-loading'
  import { SvelteToast } from '@zerodevx/svelte-toast'
  import { openModal, closeModal, Modals } from 'svelte-modals'

  import ViewPaste from './components/ViewPaste.svelte'
  import CreatePaste from './components/CreatePaste.svelte'
  import LoginModal from './components/LoginModal.svelte'
  import ViewPastes from './components/ViewPastes.svelte'

  import { storedPastes, storedAccount } from './store'

  const pageName = 'VITE_NAME' in import.meta.env ? import.meta.env.VITE_NAME : 'paaster'

  let pastesStored = false
  storedPastes.subscribe(value => {
    pastesStored = value !== null && Object.keys(value).length !== 0
  })

  let loggedIn = false
  storedAccount.subscribe(value => {
    loggedIn = value !== null && Object.keys(value).length !== 0
  })
</script>

<svelte:head>
  <title>{ pageName }</title>
</svelte:head>

<Loading />
<SvelteToast options={{duration: 1500}} />
<Modals>
  <div
    slot="backdrop"
    class="backdrop"
    on:click={closeModal}
  />
</Modals>

<Router>
  <nav>
    <Link to="/"><h2>{ pageName }</h2></Link>
    <div class="nav-right">
      {#if pastesStored || loggedIn}
        <Link to="/pastes">
          <button
          class="dark-button"
          style="margin-right: .5em;height:100%;"
          ><Fa icon={faClipboard} /> My pastes</button>
        </Link>
      {/if}
      {#if !loggedIn}
        <button
          on:click={() => openModal(LoginModal)}
          class="dark-button"
          style="margin-right: .5em;"
          ><Fa icon={faChevronRight} /> Login</button>
      {:else}
        <Link to="/">
          <button
          class="dark-button"
          style="margin-right: .5em;height:100%;"
          ><Fa icon={faUser} /> Account</button>
        </Link>
      {/if}
        <h4 class="encrypted">
          <Fa icon={faLock} />
          E2EE
        </h4>
    </div>
  </nav>

  <Route path="/" component={CreatePaste}></Route>
  <Route path="/pastes" component={ViewPastes}></Route>
  <Route path=":pasteId" component={ViewPaste}></Route>  
</Router>
