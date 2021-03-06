<template>
  <q-card>
    <q-card-section>
      <div class="row q-gutter-md">
        <div class="text-h6">Registered users</div>
        <div>
          <q-btn icon="person_add" round color="positive" size="sm" @click="inviteUser">
            <q-tooltip>Create an invitation link</q-tooltip>
          </q-btn>
        </div>
      </div>
    </q-card-section>
    <q-card-section>
      <q-table
        flat
        bordered
        :pagination.sync="pagination"
        :loading="loading"
        :columns="columns"
        :data="users"
        @request="onRequest"
      >
        <template #body-cell-id="{ value }">
          <q-td auto-width class="text-right">
            {{ value }}
          </q-td>
        </template>
        <template #body-cell-username="{ value }">
          <q-td class="text-right">
            {{ value }}
          </q-td>
        </template>
        <template #body-cell-role="{ row, value }">
          <q-td>
            <q-select dense :value="value" :options="Object.keys($ctfnote.roles)" @input="v => updateRole(row.id, v)" />
          </q-td>
        </template>
        <template #body-cell-btns="{ row }">
          <q-td auto-width>
            <div class="q-gutter-sm">
              <q-btn color="negative" title="Delete the user" size="sm" round icon="delete" @click="removeUser(row)">
                <q-tooltip>Remove the user</q-tooltip>
              </q-btn>
              <q-btn
                color="positive"
                title="Create a password reset token"
                size="sm"
                round
                icon="lock_clock"
                @click="resetPassword(row)"
              >
                <q-tooltip>Generate a reset password link</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>
      </q-table>
    </q-card-section>
  </q-card>
</template>

<script>
import db from "src/gql";
import ResetPasswordLinkDialog from "../Dialogs/ResetPasswordLinkDialog";
import InviteUserDialog from "../Dialogs/InviteUserDialog.vue";

const MAX_PER_PAGE = 100;
const DEFAULT_COUNT = 10;

export default {
  mounted() {
    this.onRequest({ pagination: this.pagination });
  },
  data() {
    const pagination = {
      rowsNumber: 0,
      rowsPerPage: DEFAULT_COUNT
    };
    const columns = [
      { name: "id", label: "ID", field: "id", sortable: true },
      { name: "username", label: "Login", field: "login", sortable: true },
      { name: "role", label: "Role", field: "role", sortable: true },
      { name: "btns" }
    ];
    return { columns, pagination, loading: false, users: [] };
  },
  methods: {
    removeUser(user) {
      this.$q
        .dialog({
          title: `Delete ${user.login} ?`,
          message: `This operation is irreversible.`,
          cancel: true,
          ok: {
            label: "Delete",
            color: "negative"
          }
        })
        .onOk(async () => {
          this.$apollo.mutate({
            mutation: db.admin.DELETE_USER,
            variables: {
              userId: user.id
            },
            refetchQueries: [{ query: db.admin.USERS }]
          });
        });
    },
    inviteUser() {
      this.$q.dialog({
        component: InviteUserDialog,
        parent: this
      });
    },
    updateRole(userId, role) {
      let self = this;
      const performUpdate = () => {
        this.$apollo.mutate({
          mutation: db.admin.UPDATE_ROLE,
          variables: { userId, role },
          update: (store, { data: { updateUserRole } }) => {
            self.users.find(u => u.id === userId).role = updateUserRole.role;
          }
        });
      };

      if (this.$ctfnote.me.id === userId) {
        this.$q
          .dialog({
            title: `Are you sure ?`,
            color: "negative",
            message: "You are about to modify your own role, are you sure ?",
            ok: "Change Role",
            cancel: true
          })
          .onOk(performUpdate);
        return;
      }

      performUpdate();
    },
    resetPassword(user) {
      this.$q.dialog({
        component: ResetPasswordLinkDialog,
        parent: this,
        user
      });
    },

    async onRequest(props) {
      const { rowsPerPage } = props.pagination;

      let page = props.pagination.page;

      if (page === void 0) {
        page = 1;
      }
      page--;

      let first = rowsPerPage > MAX_PER_PAGE ? MAX_PER_PAGE : rowsPerPage;

      if (first == 0) first = MAX_PER_PAGE;

      const offset = page * first;

      this.loading = true;
      const {
        data: {
          users: { nodes: users, totalCount }
        }
      } = await this.$apollo.mutate({
        mutation: db.admin.USERS,
        variables: { first, offset }
      });
      this.loading = false;

      this.users = users;

      this.pagination.rowsNumber = totalCount;
      this.pagination.rowsPerPage = first;
      this.pagination.page = page + 1;
    }
  }
};
</script>
