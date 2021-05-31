<template>
  <div>Logout</div>
</template>

<script>
export default {
  async created() {
    await this.$ctfnote.logout();
    window.location.reload();
  }
};
</script>
