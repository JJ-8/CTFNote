import slugify from "slugify";
import db from "src/gql";

class CTFNote {
  constructor() {
    this.roles = {
      USER_GUEST: 1,
      USER_MEMBER: 2,
      USER_MANAGER: 3,
      USER_ADMIN: 4
    };
    this.anonymous = {
      roleId: 0
    };
    this._ready = false;
    this._readyWaitList = [];
    this.waitUntilReady(() => this.registerResolvers);
    this.settings = {};
  }

  async _fetchInfo(cleared = false) {
    try {
      const responses = await Promise.all([
        this.apollo.query({ query: db.settings.GET }),
        this.apollo.query({ query: db.auth.ME })
      ]);
      return { me: responses[1].data.me, settings: responses[0].data.settings };
    } catch (e) {
      localStorage.clear();
      if (!cleared) return await this._fetchInfo(true);
    }
  }

  async init(apollo) {
    this.apollo = apollo;
    const infos = await this._fetchInfo();
    this.settings = infos.settings;
    const me = infos.me;
    if (me == null) {
      this._me = null;
    } else {
      localStorage.setItem("JWT", me.jwt);
      const roleId = this.roles[me.profile.role];
      this._me = { ...me.profile, roleId };
    }
    this.ready();
  }

  async waitUntilReady() {
    if (this._ready) return;
    return new Promise(resolve => {
      this._readyWaitList.push(resolve);
    });
  }

  ready() {
    this._ready = true;
    let resolve;
    while ((resolve = this._readyWaitList.shift())) {
      resolve();
    }
  }

  async registerResolvers(r) {
    await this.waitUntilReady();
    this.apollo.addResolvers(r);
  }
  get me() {
    if (this._me) {
      const debugRoleId = localStorage.getItem(`ctfnote.debugRoleId`);
      if (debugRoleId) {
        return { ...this._me, roleId: parseInt(debugRoleId) };
      }
      return this._me;
    }

    return this.anonymous;
  }

  get isGuest() {
    return this.me.roleId >= this.roles.USER_GUEST;
  }
  get isMember() {
    return this.me.roleId >= this.roles.USER_MEMBER;
  }
  get isManager() {
    return this.me.roleId >= this.roles.USER_MANAGER;
  }
  get isAdmin() {
    return this.me.roleId >= this.roles.USER_ADMIN;
  }
  async logout() {
    localStorage.removeItem("JWT");
    //cleanup Hedgedoc cookie
    const url = process.env.CREATE_PAD_URL != null ? process.env.CREATE_PAD_URL + "/pad/logout" : "/pad/logout";
    await fetch(url, { credentials: "same-origin" });
    this._me = null;
  }

  ctfLink(ctf) {
    return {
      name: "ctfinfo",
      params: {
        ctfId: ctf.id,
        ctfSlug: ctf.slug
      }
    };
  }

  ctfTasks(ctf) {
    return {
      name: "ctftasks",
      params: {
        ctfId: ctf.id,
        ctfSlug: ctf.slug
      }
    };
  }

  taskLink(ctf, task) {
    return {
      name: "task",
      params: {
        ctfId: ctf.id,
        ctfSlug: ctf.slug,
        taskId: task.id,
        taskSlug: task.slug
      }
    };
  }

  taskIcon(task) {
    if (task.solved) return "flag";
    const count = task.workOnTasks.nodes.length;
    if (count == 0) {
      return null;
    }
    if (count == 1) {
      return "person";
    }
    if (count == 2) {
      return "group";
    }
    return "groups";
  }
  taskIconColor(task) {
    if (task.solved) return "positive";
    const players = task.workOnTasks.nodes;
    if (players?.some(p => p.profile.id == this.me.id)) {
      return "secondary";
    }
    return "primary";
  }
}

export const ctfNote = new CTFNote();

ctfNote.registerResolvers({
  Ctf: {
    slug(ctf) {
      return slugify(ctf.title);
    }
  },
  Task: {
    slug(task) {
      return slugify(task.title);
    }
  }
});

export default async ({ Vue }) => {
  Vue.prototype.$ctfnote = ctfNote;
  Vue.ctfnote = ctfNote;
};
