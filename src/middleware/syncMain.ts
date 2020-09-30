import { ipcMain, webContents } from "electron";
import {
	Action,
	applyMiddleware,
	Middleware,
	StoreCreator,
	StoreEnhancer,
} from "redux";

import {
	freeze,
	preventDoubleInitialization,
	stopForwarding,
	validateAction,
} from "../helpers";

const middleware: Middleware = (store) => {
	ipcMain.handle("mckayla.electron-redux.FETCH_STATE", async () => {
		// Stringify the current state, and freeze it to preserve certain types
		// that you might want to use in your state, but aren't JSON serializable
		// by default.
		return JSON.stringify(store.getState(), freeze);
	});

	// When receiving an action from a renderer
	ipcMain.on("mckayla.electron-redux.ACTION", (event, action: Action) => {
		console.log("Received action:", action, "in main.")
		const localAction = stopForwarding(action);
		store.dispatch(localAction);
		console.log("Dispatched ", localAction, "in main")
		store.dispatch({type: "TEST"})

		// Forward it to all of the other renderers
		webContents.getAllWebContents().forEach((contents) => {
			// Ignore the renderer that sent the action
			if (contents.id !== event.sender.id) {
				console.log("Forwarding to: ", contents.id)
				contents.send("mckayla.electron-redux.ACTION", localAction);
			}
		});
	});

	return (next) => (action) => {
		console.log("Electron-redux middleware received: ", action)
		if (validateAction(action)) {
			console.log(action, "Action validated.")
			webContents.getAllWebContents().forEach((contents) => {
				contents.send("mckayla.electron-redux.ACTION", action);
			});
		}

		return next(action);
	};
};

export const syncMain: StoreEnhancer = (createStore: StoreCreator) => {
	preventDoubleInitialization();

	return (reducer, state) => {
		return createStore(reducer, state, applyMiddleware(middleware));
	};
};

export const syncMainMiddleware = middleware;
