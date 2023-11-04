import React, { useEffect } from "react";
import {
  CleanupLocalStorage,
  handleNkLoginRequest,
  handleNkLoginReturn,
  NkAuthRedirectPath,
} from "./nk-auth-handler.ts";
import { INkAuthContext, NkAuthContext } from "./NkAuthContext.ts";

/**
 * Interface for the properties that can be passed to the Auth provider
 */
interface INkAuthProviderProps {
  /**
   * Generic callback handler, redirects to the provided URL
   * @param state application state, as provided by the client
   * @param code the code that was generated by the redirect attempt
   */
  redirectCallback: (state: Record<string, unknown>, code: string) => void;

  /**
   * Callback handler for what should happen when a redirect to this is
   * attempted, but fails for some reason
   */
  redirectError: () => void;

  /**
   * The child nodes the Provider has wrapped
   */
  children?: React.ReactNode;
}

/**
 * Creates an NK Authentication Provider, automatically handling redirects and login attempts
 * as provided. Does not perform any redirection, that is expected to be performed
 * by the callbacks in the props
 */
export default function NkAuthProvider(props: INkAuthProviderProps) {
  const context = {
    handleNkLogin: (state: Record<string, unknown>) => {
      handleNkLoginRequest(state);
    },
  } satisfies INkAuthContext;

  // Effect to handle automatic login
  useEffect(() => {
    // Do nothing if we're not at the NK Redirect pathing
    if (location.pathname != NkAuthRedirectPath) {
      CleanupLocalStorage(); // Ensure we have no bogus items in local storage
      return;
    }

    try {
      // Handle the NK login attempt
      const { state, code } = handleNkLoginReturn();

      // Handle the redirect callback
      props.redirectCallback(state, code);
    } catch (error) {
      // Invoke the redirect error handler
      props.redirectError();
    }
  });

  return (
    <NkAuthContext.Provider value={context}>
      {props.children}
    </NkAuthContext.Provider>
  );
}