<script lang="ts">
  import "./assets/style.css";
  import "./assets/icons/1.3.0/css/line-awesome.min.css";
  import { Router, link, Route } from "svelte-navigator";

  import { Toaster } from "svelte-french-toast";
  import { Loading } from "@tadashi/svelte-loading";
  import CreatePaste from "./routes/CreatePaste.svelte";
  import LazyRoute from "./components/LazyRoute.svelte";
  import PageLoading from "./components/PageLoading.svelte";
</script>

<Router primary={false}>
  <nav>
    <a href="/" use:link><h1>paaster</h1></a>
    <a href="/pastes" use:link class="button"
      ><i class="lab la-buffer" />Saved pastes</a
    >
  </nav>

  <Route path="/">
    <CreatePaste />
  </Route>
  <LazyRoute
    path="/pastes"
    delayMs={500}
    component={() => import("./routes/StorePastes.svelte")}
  >
    <PageLoading />
  </LazyRoute>
  <LazyRoute
    path="/:pasteId"
    delayMs={500}
    component={() => import("./routes/ViewPaste.svelte")}
  >
    <PageLoading />
  </LazyRoute>
</Router>

<Loading
  animation="Jelly"
  color="var(--lighterBg)"
  --tadashi_svelte_loading_background_color="var(--darkBgTrans)"
  --tadashi_svelte_loading_zindex="1011"
/>

<Toaster toastOptions={{ className: "toast" }} />
