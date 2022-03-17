<script lang="ts">
  import Fa from 'svelte-fa'
  import { 
    faLock, faClipboard,
  } from '@fortawesome/free-solid-svg-icons'

  import { Route, Router, Link } from 'svelte-navigator'

  import { Loading } from '@tadashi/svelte-loading'
  import { SvelteToast } from '@zerodevx/svelte-toast'

  import ViewPaste from './components/ViewPaste.svelte'
  import CreatePaste from './components/CreatePaste.svelte'
  import ViewPastes from './components/ViewPastes.svelte'

  import { storedPastes } from './store'

  const pageName = 'VITE_NAME' in import.meta.env ? import.meta.env.VITE_NAME : 'paaster'

  let pastesStored = false
  storedPastes.subscribe(value => {
    pastesStored = value !== null && Object.keys(value).length !== 0
  })
</script>

<svelte:head>
  <title>{ pageName }</title>
</svelte:head>

<Loading />
<SvelteToast options={{duration: 1500}} />

<Router>
  <nav>
    <Link to="/"><h2>{ pageName }</h2></Link>
    <div class="nav-right">
      {#if pastesStored}
        <Link to="/pastes">
          <button
          class="dark-button"
          style="margin-right: .5em;height:100%;"
          ><Fa icon={faClipboard} /> My pastes</button>
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
