function counter(state, action) {
  if (typeof state === 'undefined') {
    return {
      count: 0,
      previous: new Set(),
      map: new Map([
        ['a', 'x'],
        ['b', 'y'],
        ['c', 'z'],
      ]),
    };
  }

  switch (action.type) {
    case 'INCREMENT':
      return {
        ...state,
        count: state.count + 1,
        previous: new Set([...state.previous, state.count]),
      };
    case 'DECREMENT':
      return {
        ...state,
        count: state.count - 1,
        previous: new Set([...state.previous, state.count]),
      };
    default:
      return state;
  }
}

module.exports = counter;
