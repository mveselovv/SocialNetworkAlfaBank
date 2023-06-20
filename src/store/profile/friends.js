import friends from '@/requests/friends';
import createQuery from '@/utils/createQuery';

const dispatchSetAlert = (dispatch, text) =>
  dispatch('global/alert/setAlert', { status: 'success', text }, { root: true });

const dispatchSearchUsers = (dispatch, users) => {
  if (!users) {
    users = {
      firstName: null,
      lastName: null,
      ageFrom: null,
      ageTo: null,
      country: null,
      city: null,
    };
  }
  dispatch('global/search/searchUsers', users, {
    root: true,
  });
};

export default {
  namespaced: true,
  state: {
    result: {
      friends: [],
      request: [],
      recommendations: [],
    },
    friends: {},
    paginations: {},
    requestsCount: null,
    friendSearch: null,
    loadedCounts: {
      REQUEST_FROM: 0,
      REQUEST_TO: 0,
      FRIEND: 0,
      BLOCKED: 0,
      SUBSCRIBED: 0,
      WATCHING: 0,
    },
  },

  getters: {
    getResult: (s) => s.result,
    getResultById: (s) => (id) => s.result[id],
  },

  mutations: {
    setResult: (s, payload) => (s.result[payload.id] = payload.value),

    setFriends: (s, payload) => {
      payload.forEach((user) => {
        const { statusCode } = user;
        const isDouble = !s.friends[statusCode]
          ? false
          : s.friends[statusCode].find((currentUser) => currentUser.id === user.id);

        if (isDouble) return;

        s.friends = {
          ...s.friends,
          [statusCode]: s.friends[statusCode] ? [...s.friends[statusCode], user] : [user],
        };
      });
    },

    setRequestsCount: (s, payload) => {
      s.requestsCount = payload;
    },

    setFriendSearch: (s, payload) => {
      s.friendSearch = payload;
    },

    resetFriendSearch(state) {
      state.friendSearch = null;
    },

    setPaginations: (s, { totalElements, totalPages, field }) => {
      s.paginations[field] = { totalElements, totalPages };
    },

    setLoadedCount: (s, { statusCode, count }) => {
      s.loadedCounts = {
        ...s.loadedCounts,
        [statusCode]: count,
      };
    },
  },

  actions: {
    async apiFriends({ commit, state }, { statusCode, loadMore = false }) {
      const query = createQuery({ statusCode, size: loadMore ? state.loadedCounts[statusCode] + 6 : 3 });
      const { data } = await friends.get(query);
      const { content } = data;
      const { totalElements, totalPages } = data;
      commit('setResult', { id: 'friends', value: content || [] });
      commit('setFriends', content);
      commit('setPaginations', { totalElements, totalPages, field: statusCode });
      if (loadMore) {
        commit('setLoadedCount', { statusCode, count: state.loadedCounts[statusCode] + 3 });
      }
    },

    async apiDeleteFriends({ dispatch }, id) {
      await friends.delete(id);
      dispatchSetAlert(dispatch, 'Пользователь удален из друзей');
      dispatch('global/search/searchUsers', 'global/search/getLastSearchUsersRequest', {
        root: true,
      });
    },

    async apiAddFriends({ dispatch, getters, rootGetters }, { id, isApprove = false }) {
      const _friend = getters.getResult.friends.find((fr) => fr.id === id);
      if (_friend && _friend.statusCode === 'REQUEST_TO') {
        dispatchSetAlert(dispatch, 'Вы уже отправляли запрос этому пользователю!');
        return;
      }

      if (_friend && _friend.statusCode === 'REJECTING') {
        dispatchSetAlert(dispatch, 'Этот пользователь заблокировал Вас!');
        return;
      }

      if (_friend && _friend.statusCode === 'BLOCKED') {
        dispatchSetAlert(dispatch, 'Вы заблокировали этого пользователя!');
        return;
      }

      if (_friend && _friend.statusCode === 'FRIEND') {
        dispatchSetAlert(dispatch, 'Вы уже друзья с этим пользователем!');
        return;
      }
      const { data } = await friends.addFriends(id, isApprove);

      if (data && data.message === 'request already sent!') {
        dispatchSetAlert(dispatch, 'Вы уже отправляли запрос этому пользователю!');
      } else if (data && data.message === 'Blocked!') {
        dispatchSetAlert(dispatch, 'Этот пользователь заблокировал Вас!');
      } else dispatchSetAlert(dispatch, 'Заявка отправлена');
      dispatch('apiFriends');
      dispatchSearchUsers(dispatch, rootGetters['global/search/getLastSearchUsersRequest']);
    },

    async apiSubscribe({ dispatch, rootGetters }, id) {
      await friends.addSubscribe(id);

      dispatchSetAlert(dispatch, 'Заявка отправлена');
      dispatch('apiFriends');
      dispatchSearchUsers(dispatch, rootGetters['global/search/getLastSearchUsersRequest']);
    },

    async apiRequest({ commit }, payload) {
      const query = createQuery(payload);
      const { data } = await friends.getRequest(query);
      commit('setResult', { id: 'request', value: data });
    },

    async apiRecommendations({ commit }, payload) {
      const query = createQuery(payload);
      const { data } = await friends.getRecommendations(query);
      commit('setResult', { id: 'recommendations', value: data || [] });
    },

    async apiRequestsCount({ commit }) {
      const { data } = await friends.friendRequestsCount();
      commit('setRequestsCount', data);
    },

    async apiFriendSearch({ commit }, { firstName, statusCode }) {
      const { data } = await friends.friendSearch(firstName, statusCode);
       commit('setFriendSearch', data);
    },
  },
};
