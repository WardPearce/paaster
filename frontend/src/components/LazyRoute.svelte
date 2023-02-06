<script lang="ts">
  import { Route } from "svelte-navigator";
  import Lazy from "./Lazy.svelte";

  export let component: any;
  export let delayMs: number | null = null;

  let props: Record<any, any>;
  $: {
    // eslint-disable-next-line no-shadow
    const { component, ...restProps } = $$props;
    props = restProps;
  }
</script>

<Route {...props} let:params>
  <Lazy {component} {delayMs} {...params}>
    <slot />
  </Lazy>
</Route>
