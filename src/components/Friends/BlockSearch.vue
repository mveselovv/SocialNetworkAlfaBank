<template>
  <div class="friends-block" ref="dropdown">
    <div class="friends-block__img">
      <img v-if="info.photo" :src="info.photo" :alt="info.firstName" />
      <img v-else src="/static/img/avatar.png" :alt="info.firstName" />
    </div>

    <div class="friends-block__info">
      <div class="friends-block-top-name">
        <router-link class="friends-block__name" :to="{ name: 'ProfileId', params: { id: info.id } }">
          {{ info.firstName }}
          {{ info.lastName }}
        </router-link>
        <span class="user-status isonline-lasttime" v-if="info.lastOnlineTime === null">был(а) в сети давно</span>
        <span class="user-status isonline-online" v-else-if="info.isOnline">{{ translations.profileInfoStatusOnline }}</span>
        <span class="user-status isonline-lasttime" v-else>был(а) в сети {{ info.lastOnlineTime | moment('from') }}</span>
      </div>

      <span class="friends-block__age-city" v-if="moderator">модератор</span>

      <span class="friends-block__age-city" v-else-if="info.birthDate && info.country">
        {{ info.birthDate | moment('from', true) }},
        {{ info.city ? info.city : (info.country ? info.country : translations.profileNotFilled) }}
      </span>

      <span class="friends-block__age-city" v-else>{{ translations.profileNotFilledAll }}</span>
    </div>

    <div>
      <button
        :class="{ 'friends-block__showmore': true, 'active': showDropdown }"
        @click.prevent="toggleDropdown"
      >
        <actions-show />
      </button>
      <div class="friends-block__actions" v-if="showDropdown" v-click-outside="closePopup">
        <template v-if="moderator">
          <div
            class="friends-block__actions-block"
            @click="openModal('deleteModerator')"
          >
            <span>{{ translations.friendsBlockEdit }}</span>
            <simple-svg :filepath="'/static/img/edit.svg'" />
          </div>
          <div
            class="friends-block__actions-block"
            @click="openModal('deleteModerator')"
          >
            <span>{{ translations.friendsBlockDelete }}</span>
            <simple-svg :filepath="'/static/img/delete.svg'" />
          </div>
        </template>
        <template v-else-if="admin">
          <div
            class="friends-block__actions-block"
            v-if="blocked || info.isBlocked"
          >
            <span>{{ translations.profileAccountBlocking }}</span>
            <simple-svg class="filter-green" :filepath="'/static/img/security-system-unlock.svg'" />
          </div>
          <div class="friends-block__actions-block" v-else>
            <span>{{ translations.profileAccountUnblocking }}</span>
            <simple-svg :filepath="'/static/img/unblocked.svg'" />
          </div>
        </template>
        <template v-else>
          <div
            v-if="info.statusCode === 'WATCHING' && info.statusCode !== 'FRIEND'"
            class="friends-block__actions-block message subscribe__icon"
            @click="openModal('deleteSubscribe')"
          >
            <span>{{ translations.profileAccountUnsubscribe }}</span>
            <simple-svg :filepath="'/static/img/delete.svg'" />
          </div>
          <div
            v-else-if="info.statusCode !== 'FRIEND' && info.statusCode !== 'REQUEST_TO' && info.statusCode !== 'BLOCKED' && info.statusCode !== 'REQUEST_FROM'"
            class="friends-block__actions-block message subscribe__icon"
            @click="subscribe(info.id)"
          >
            <span>{{ translations.profileAccountSubscribe }}</span>
            <simple-svg :filepath="'/static/img/sidebar/admin/comments.svg'" />
          </div>
          <div
            v-if="info.statusCode === 'REQUEST_FROM'"
            class="friends-block__actions-block message"
            @click="acceptFriendRequest(info.id)"
          >
            <span>{{ translations.profileAccountAcceptRequests }}</span>
            <simple-svg class="accept" :filepath="'/static/img/add.svg'" />
          </div>
          <div
            class="friends-block__actions-block message"
            @click="sendMessage(messageId)"
            v-if="info.statusCode !== 'BLOCKED'"
          >
            <span>{{ translations.profileAccountSendMessage }}</span>
            <simple-svg :filepath="'/static/img/sidebar/im.svg'" />
          </div>
          <div
            class="friends-block__actions-block delete"
            @click="openModal('delete')"
            v-if="info.statusCode === 'FRIEND'"
          >
            <span>{{ translations.profileAccountDeleteFriend }}</span>
            <simple-svg :filepath="'/static/img/delete.svg'" />
          </div>
          <div
            class="friends-block__actions-block delete"
            @click="openModal('cancelFriend')"
            v-else-if="info.statusCode === 'REQUEST_TO'"
          >
            <span>{{ translations.profileAccountCancelFriend }}</span>
            <simple-svg :filepath="'/static/img/delete.svg'" />
          </div>
          <div
            class="friends-block__actions-block add"
            @click="addToFriend(info.id)"
            v-else-if="info.statusCode !== 'WATCHING' && info.statusCode !== 'REQUEST_TO' && info.statusCode !== 'BLOCKED' && info.statusCode !== 'REQUEST_FROM'"
          >
            <span>{{ translations.profileAccountAddFriend }}</span>
            <simple-svg :filepath="'/static/img/friend-add.svg'" />
          </div>
          <div
            class="friends-block__actions-block"
            v-if="blocked || info.isBlocked || info.statusCode === 'BLOCKED'"
            @click="openModal('unblock')"
          >
            <span>{{ translations.profileAccountUnblocking }}</span>
            <simple-svg class="filter-green" :filepath="'/static/img/security-system-unlock.svg'" />
          </div>
          <div
            v-else
            class="friends-block__actions-block"
            @click="openModal('block')"
          >
            <span>{{ translations.profileAccountBlocking }}</span>
            <simple-svg :filepath="'/static/img/unblocked.svg'" />
          </div>
        </template>
      </div>
    </div>

    <modal v-model="modalShow">
      <p v-if="modalText">{{ modalText }}</p>
      <template slot="actions">
        <button-hover @click.native="onConfrim(targetId)">{{ translations.yes }}</button-hover>
        <button-hover variant="red" bordered="bordered" @click.native="closeModal">
          {{ translations.cancel }}
        </button-hover>
      </template>
    </modal>
  </div>
</template>

<script>
import Modal from '@/components/Modal';
import ActionsShow from '@/Icons/ActionsShow.vue';
import { mapActions, mapGetters } from 'vuex';
import vClickOutside from 'v-click-outside';
import translations from '@/utils/lang.js';

export default {
  name: 'FriendsBlock',
  directives: {
    clickOutside: vClickOutside.directive
  },
  components: { Modal, ActionsShow },
  props: {
    friend: Boolean,
    admin: Boolean,
    blocked: Boolean,
    moderator: Boolean,
    subscribeButton: {
      type: Boolean,
      default: false,
    },
    acceptButton: {
      type: Boolean,
      default: false,
    },
    info: {
      type: Object,
      default: () => ({
        firstName: 'Михаил',
        lastName: 'Веселов',
        birthDate: 1559751301818,
        town_id: 1,
        photo: '/static/img/user/user_1.jpg',
        id: 124,
      }),
    },
  },

  data: () => ({
    modalShow: false,
    modalType: 'delete',
    showDropdown: false,
  }),

  computed: {
    ...mapGetters('profile/dialogs', ['dialogs']),


    translations() {
      const lang = this.$store.state.auth.languages.language.name;
      if (lang === 'Русский') {
        return translations.rus;
      } else {
        return translations.eng;
      }
    },

    statusText() {
      return this.info.isOnline ? this.translations.profileInfoStatusOnline : this.translations.profileInfoStatusOffline;
    },

    friends() {
      return this.$store.state.friends
    },

    online() {
      return this.info.isOnline;
    },

    currentUser() {
      return this.$store.getters.getUser;
    },

    targetId() {
      if (this.info.fromAccountId) {
        if (this.info.fromAccountId === this.currentUser) {
          return this.info.toAccountId;
        } else {
          return this.info.fromAccountId;
        }
      } else {
        return this.info.id;
      }
    },

    modalText() {
      let text = '';
      if (this.modalType === 'delete') {
        text = `Вы уверены, что хотите удалить пользователя ${
          this.info.firstName + ' ' + this.info.lastName
        } из друзей?`;
      } else if (this.modalType === 'deleteSubscribe') {
        text = `Вы уверены, что хотите отписаться от пользователя ${
          this.info.firstName + ' ' + this.info.lastName
        }?`;
      } else if (this.modalType === 'cancelFriend') {
        text = `Вы уверены, что хотите отменить запрос в дружбу с ${
          this.info.firstName + ' ' + this.info.lastName
        }?`;
      } else if (this.modalType === 'deleteModerator') {
        text = `Вы уверены, что хотите удалить ${
          this.info.firstName + ' ' + this.info.lastName
        } из списка модераторов?`;
      } else if (this.modalType === 'block') {
        text = `Вы уверены, что хотите заблокировать пользователя ${
          this.info.firstName + ' ' + this.info.lastName
        }?`;
      } else if (this.modalType === 'unblock') {
        text = `Вы уверены, что хотите разблокировать  пользователя ${
          this.info.firstName + ' ' + this.info.lastName
        }?`;
      }
      return text;
    },

    messageId() {
      if (this.info.toAccountId) {
        return this.info.toAccountId;
      } else return this.info.id;
    },
  },


  methods: {
    ...mapActions('profile/friends', ['apiAddFriends', 'apiDeleteFriends', 'apiSubscribe']),
    ...mapActions('profile/dialogs', ['openDialog']),
    ...mapActions('users/actions', ['apiBlockedUser', 'apiUnblockUser']),

    acceptFriendRequest(id) {
      this.apiAddFriends({ id, isApprove: true });
      this.$nextTick();
      this.$forceUpdate();
    },

    addToFriend(id) {
      this.apiAddFriends({ id });
      this.$nextTick();
      this.$forceUpdate();
    },

    subscribe(id) {
      this.apiSubscribe(id);
      this.$nextTick();
      this.$forceUpdate();
    },

    closeModal() {
      this.modalShow = false;
    },

    openModal(id) {
      this.modalType = id;
      this.modalShow = true;
    },

    sendMessage(userId) {
      this.$router.push({ name: 'ImChat', params: { activeDialogId: userId } });
    },

    async onConfrim(id) {

    if (this.modalType === 'delete') {
      this.apiDeleteFriends(id).then(() => {
        this.closeModal();
        this.$nextTick();
        this.$forceUpdate();
      });
    }

    if (this.modalType === 'deleteSubscribe') {
      this.apiDeleteFriends(id).then(() => {
        this.closeModal();
        this.$nextTick();
        this.$forceUpdate();
      });
    }

    if (this.modalType === 'cancelFriend') {
      this.apiDeleteFriends(id).then(() => {
        this.closeModal();
        this.$nextTick();
        this.$forceUpdate();
      });
    }

    if (this.modalType === 'deleteModerator') {
      this.closeModal();
      this.$nextTick()
      this.$forceUpdate();
    }

    if (this.modalType === 'block') {
      this.apiBlockedUser(id).then(() => {
        this.blocked = true;
        this.closeModal();
        this.$nextTick();
        this.$forceUpdate();
      });
    }

    if (this.modalType === 'unblock') {
      this.apiUnblockUser(id).then(() => {
        this.blocked = false;
        this.closeModal();
        this.$nextTick();
        this.$forceUpdate();
      });
    }
        this.$nextTick();
        this.$forceUpdate();
    },

    closePopup() {
      this.showDropdown = false
    },

    toggleDropdown() {
      this.showDropdown = !this.showDropdown;
    },
  },
};
</script>

<style lang="stylus">
@import '../../assets/stylus/base/vars.styl'

.accept path
  fill ui-cl-color-sea-green

.subscribe__icon
    path
      stroke ui-cl-color-sea-green
      stroke-opacity 1
      stroke-width 2

.friends-block
  position relative
  align-items center
  background ui-cl-color-white-theme
  box-shadow box-shadow-main
  padding 20px
  width 100%
  display inline-flex
  border-radius border-small
  &:not(:last-child)
    margin-bottom 20px

  .friends-block__showmore
    background transparent
    padding 0
    svg path:nth-child(1)
      fill none
      stroke ui-cl-color-ababab
    svg path:nth-child(2),
    svg path:nth-child(3),
    svg path:nth-child(4)
      fill ui-cl-color-ababab
    &.active
      svg path:nth-child(1)
        fill none
        stroke ui-cl-color-eucalypt
      svg path:nth-child(2),
      svg path:nth-child(3),
      svg path:nth-child(4)
        fill ui-cl-color-eucalypt

.friends-block__img
  width 65px
  height 65px
  border-radius border-half
  overflow hidden
  margin-right 30px
  flex none

  @media (max-width breakpoint-xxl)
    margin-right 10px

  img
    object-fit cover
    width 100%
    height 100%

.friends-block__info
  margin-right auto

.friends-block__name
  font-weight font-weight-bold
  font-size font-size-updefault
  line-height 27px
  color ui-cl-color-steel-gray
  display block

  @media (max-width breakpoint-xxl)
    font-size font-size-small

.friends-block__age-city
  font-size font-size-default
  line-height 22px
  color #5A5A5A

  @media (max-width breakpoint-xxl)
    font-size font-size-small

.friends-block__actions
  background-color ui-cl-color-white-theme
  position absolute
  right 20px
  top 70%
  display flex
  flex-direction column
  align-items flex-start
  border-radius border-small
  box-shadow box-shadow-main
  transition all 0.3s ease
  z-index 15
  overflow hidden
  &-block
    display flex
    width 100%
    align-items center
    font-size font-size-small
    font-weight font-weight-medium
    justify-content flex-end
    gap 7px
    padding 12px
    flex-direction row-reverse
    cursor pointer
    @media (any-hover: hover)
      &:hover
        background #fbfbfb
        span
          color ui-cl-color-eucalypt

  @media (max-width breakpoint-xxl)
    & + &
      margin-left 5px

  & + &
    margin-left 10px

  &.message
    margin-top 5px

    .simple-svg
      fill ui-cl-color-eucalypt

  &.delete
    margin-top 3px

  &.add
    margin-top 2px
    margin-left 15px

  .simple-svg-wrapper
    font-size 0
    width 15px
    height 15px
</style>
