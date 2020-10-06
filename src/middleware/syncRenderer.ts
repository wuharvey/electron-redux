import {
	Action,
	applyMiddleware,
	Middleware,
	Reducer,
	StoreCreator,
	StoreEnhancer,
} from "redux";

import {
	hydrate,
	preventDoubleInitialization,
	stopForwarding,
	validateAction,
} from "../helpers";

export async function getRendererState(callback: (state: unknown) => void) {
	// Electron will throw an error if there isn't a handler for the channel.
	// We catch it so that we can throw a more useful error

	//@ts-ignore
	const state = window.electron_redux.getState()

	// We do some fancy hydration on certain types like Map and Set.
	// See also `freeze`
	callback(JSON.parse(state, hydrate));
}

/**
 * This next bit is all just for being able to fill the store with the correct
 * state asynchronously, because blocking the thread feels bad for potentially
 * large stores.
 */
type InternalAction = ReturnType<typeof replaceState>;

/**
 * Creates an action that will replace the current state with the provided
 * state. The scope is set to local in this creator function to make sure it is
 * never forwarded.
 */
const replaceState = <S>(state: S) => ({
	type: "mckayla.electron-redux.REPLACE_STATE" as const,
	payload: state,
	meta: { scope: "local" },
});

const wrapReducer = (reducer: Reducer) => <S, A extends Action>(
	state: S,
	action: InternalAction | A,
) => {
	switch (action.type) {
		case "mckayla.electron-redux.REPLACE_STATE":
			return (action as InternalAction).payload;
		default:
			return reducer(state, action);
	}
};

const middleware: Middleware = (store) => {
	// When receiving an action from main
	// ipcRenderer.on("mckayla.electron-redux.ACTION", (_, action: Action) => {
	// 	store.dispatch(stopForwarding(action));
	// });
	//@ts-ignore
	window.electron_redux.replayInRenderer(store)

	return (next) => (action) => {
		if (validateAction(action)) {
			// ipcRenderer.send("mckayla.electron-redux.ACTION", action);
			//@ts-ignore
			window.electron_redux.sendFromRenderer(action)
		}

		return next(action);
	};
};

export const syncRenderer: StoreEnhancer = (createStore: StoreCreator) => {
	preventDoubleInitialization();

	return (reducer, state) => {
		const store = createStore(
			wrapReducer(reducer),
			state,
			applyMiddleware(middleware),
		);

		// This is the reason we need to be an enhancer, rather than a middleware.
		// We use this (along with the wrapReducer function above) to dispatch an
		// action that initializes the store without needing to fetch it synchronously.
		getRendererState((state) => {
			store.dispatch(replaceState(state));
		});

		// XXX: TypeScript is dumb. If you return the call to createStore
		// immediately it's fine, but even assigning it to a constant and returning
		// will make it freak out. We fix this with the line below the return.
		return store;

		// XXX: Even though this is unreachable, it fixes the type signature????
		return (store as unknown) as any;
	};
};
