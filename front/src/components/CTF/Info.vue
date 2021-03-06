<template>
  <div class="head column q-px-md" :style="style">
    <div class="col q-py-md">
      <div class="row q-gutter-md items-center">
        <q-btn type="a" :title="ctf.ctfUrl" target="_blank" :href="ctf.ctfUrl" flat icon="language" round />
        <div class="text-h4">
          {{ ctf.title }}
        </div>
        <q-btn round icon="edit" color="primary" @click="editCtf" v-if="$ctfnote.isManager">
          <q-tooltip>Edit the CTF</q-tooltip>
        </q-btn>
        <q-space />
        <q-chip icon="fitness_center" color="grey-4" text-color="grey-10" :label="ctf.weight || '-'" />

        <a :href="ctf.ctftimeUrl" target="_blank">
          <q-tooltip>Browse CTFTime.org</q-tooltip>
          <img height="30px" src="../../assets/ctftime-logo.svg" />
        </a>
      </div>
    </div>

    <div class="col q-py-md">
      <div class="q-gutter-md items-center">
        <div>Start: {{ startTime }}</div>
        <div>End: {{ endTime }}</div>
      </div>
    </div>
    <div class="col q-py-md">
      <div class="row q-gutter-md">
        <div class="col">
          <div class="column q-gutter-sm">
            <div class="text-h6">Description</div>
            <q-markdown no-html :src="ctf.description" />
          </div>
        </div>
        <q-separator vertical />
        <div class="col">
          <div class="column q-gutter-sm">
            <div class="row">
              <div class="text-h6 q-mr-md">Credentials</div>
              <q-btn round size="sm" color="primary" v-if="$ctfnote.isManager" icon="edit" @click="editCredentials">
                <q-tooltip>Edit the credentials</q-tooltip>
              </q-btn>
            </div>
            <q-markdown no-html :src="credentials" class="blur" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import EditCtfDialog from "../Dialogs/EditCtfDialog.vue";
import * as utils from "src/utils";
import db from "src/gql";
export default {
  props: {
    ctf: { type: Object, required: true }
  },
  apollo: {
    credentials: {
      query: db.secret.GET,
      variables() {
        return { ctfId: this.ctf.id };
      },
      update: data => data.ctfSecret.credentials
    }
  },
  computed: {
    style() {
      return { "--bgUrl": `url(${this.ctf.logoUrl})` };
    },
    startTime() {
      return utils.getDateTime(this.ctf.startTime);
    },
    endTime() {
      return utils.getDateTime(this.ctf.endTime);
    }
  },
  methods: {
    editCredentials() {
      this.$q
        .dialog({
          title: "Edit credentials",
          color: "primary",
          prompt: {
            model: "",
            type: "textarea"
          },
          cancel: true
        })
        .onOk(async credz => {
          this.$apollo.mutate({
            mutation: db.secret.UPDATE,
            variables: { ctfId: this.ctf.id, credentials: credz },
            update: store => {
              const query = {
                query: db.secret.GET,
                variables: { ctfId: this.ctf.id }
              };
              const data = store.readQuery(query);
              data.ctfSecret.credentials = credz;
              store.writeQuery({ ...query, data });
            }
          });
        });
    },
    editCtf() {
      this.$q.dialog({
        component: EditCtfDialog,
        parent: this,
        ctf: this.ctf
      });
    }
  }
};
</script>

<style lang="scss" scopped>
.head * {
  z-index: 1;
}
.head::before {
  z-index: 0;
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  content: "";
  opacity: 0.3;
  background: var(--bgUrl);
  background-position: 90% 50%;
  background-size: contain;
  background-repeat: no-repeat;
}
</style>
