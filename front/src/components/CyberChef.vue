
<template>    
    <q-btn round icon="mdi-chef-hat" flat @click="createCyberchef"></q-btn>
</template>
  
<script>
import WinBox from "winbox/src/js/winbox";
import "winbox/dist/css/winbox.min.css"; 
import { colors } from 'quasar'

export default {
  data: () => ({
      options: {
          title: 'Current count: 0',
          class: 'modern'
      },
      count: 1
  }),
  methods: { 
      createCyberchef() {
          var w = new WinBox({title: "Cyberchef " + this.count, index: '10000', background: colors.getBrand('primary'), width: '50%', height: '90%', x: '50%', y: '10%'})
          w.addClass("no-full")
          w.setUrl("https://gchq.github.io/CyberChef/")
          this.count = this.count + 1
      }
  }
}
</script>
