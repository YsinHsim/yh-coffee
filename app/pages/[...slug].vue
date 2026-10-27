<script setup lang="ts">
const route = useRoute();
useHead({ title: "YH Coffee — Not found" });
</script>

<template>
  <div class="container" style="text-align:center; margin-top:20vh;">
    <h1>404</h1>
    <NuxtLink to="/" class="btn">Back to menu</NuxtLink>
  </div>
</template>
