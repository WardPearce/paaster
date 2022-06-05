<script lang="ts" context="module">
  import { register } from 'svelte-loadable'

  const ViewPaste = register({
    loader: () => import('./pages/ViewPaste.svelte'),
    resolve: () => import('./pages/ViewPaste.svelte'),
  })

  const CreatePaste = register({
    loader: () => import('./pages/CreatePaste.svelte'),
    resolve: () => import('./pages/CreatePaste.svelte'),
  })

  const ViewPastes = register({
    loader: () => import('./pages/ViewPastes.svelte'),
    resolve: () => import('./pages/ViewPastes.svelte'),
  })
</script>

<script lang="ts">
  import Fa from 'svelte-fa'
  import { 
    faLock, faClipboard
  } from '@fortawesome/free-solid-svg-icons'

  import { Route, Router, Link } from 'svelte-routing'

  import Loadable from 'svelte-loadable'

  import { Loading } from '@tadashi/svelte-loading'
  import { SvelteToast } from '@zerodevx/svelte-toast'

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
        <a href="https://github.com/WardPearce/paaster#security" target="_blank" rel="noopener noreferrer">
          <h4 class="encrypted">
            <Fa icon={faLock} />
            E2EE
          </h4>
        </a>
    </div>
  </nav>

  <Route path="/">
    <Loadable loader="{CreatePaste}" />
  </Route>
  <Route path="/pastes">
    <Loadable loader="{ViewPastes}" />
  </Route>
  <Route path=":pasteId" let:params>
    <Loadable loader="{ViewPaste}" pasteId={params.pasteId}>
      <div slot="loading">Loading...</div>
    </Loadable>
  </Route>  
</Router>
