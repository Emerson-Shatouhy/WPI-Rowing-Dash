import { nanoid } from "nanoid";

// NK Auth Redirect path location
export const NkAuthRedirectPath = "/nk-auth-redirect";

/**
 * Handles an NK login request, saving the necessary items in local storage
 * and redirecting to NK with the required parameters
 * @param state the application redirection data, as provided by the client
 */
export function handleNkLoginRequest(state: Record<string, unknown>): void {
  // Create a secure ID to pass with state
  const id = nanoid(15);

  // Session data, include the current URL and the expiry for this token
  const sessionData: IRedirectData = {
    state: state,
    expiresOn: Date.now() + 60 * 1000,
  };

  // Save the session
  localStorage.setItem(id, JSON.stringify(sessionData));

  // Create the params for the callback
  const urlParams = new URLSearchParams({
    response_type: "code",
    // Look in the env file for the client id
    client_id: "logbook-visualizer",
    redirect_uri: window.location.origin + NkAuthRedirectPath,
    scope: "read",
    state: id,
  });

  // Redirect to the NK oauth provider
  window.location.assign(
    "https://oauth-logbook.nksports.com/oauth/authorize?" +
      urlParams.toString(),
  );
}

/**
 * Handles the return from a NK login redirect. Assumes the current URL
 * contains the data required for processing. Then, cleans up local storage
 * @returns the code generated by the NK login attempt, along with the desired redirect URL
 * @throws {Error} if the redirect attempt isn't valid due to the state
 * not matching locally stored state (e.g., this is expired OR from a phishing/CSRF attempt).
 * In this case, local storage will STILL BE CLEANED
 */
export function handleNkLoginReturn(): IRedirectReturn {
  // Parse the URL search parameters, so we have the desired data
  const urlParams = new URLSearchParams(location.search);

  const code = urlParams.get("code"); // Get the returned code
  const state = urlParams.get("state"); // Get the returned state

  // Validate that we have the code and state (as we need both)
  if (code == null || state == null) {
    CleanupLocalStorage(); // Cleanup local storage before throwing
    throw new Error("Redirect missing code/state!");
  }

  // Get the state out of the local storage
  const stateBodyString = localStorage.getItem(state);

  CleanupLocalStorage(); // Cleanup the local storage now

  // Validate we actually have the body
  if (stateBodyString == null) {
    throw new Error("Missing state in local storage!");
  }

  // Now parse the body into JSON
  const stateBody = JSON.parse(stateBodyString) as IRedirectData;

  // Validate the attempt hasn't expired
  if (stateBody.expiresOn > Date.now()) {
    throw new Error("Redirect attempt expired!");
  }

  return { state: stateBody.state, code: code } satisfies IRedirectReturn;
}

/**
 * Function that cleans up all redirect attempts in local storage, ensuring
 * that bogus data is not persisted
 */
export function CleanupLocalStorage() {
  for (let i = 0; i < localStorage.length; i++) {
    // Get the information about the storage
    const storageKey = localStorage.key(i)!;
    const storageItem: unknown = JSON.parse(localStorage.getItem(storageKey)!)!;

    // If this is redirect data, remove it
    if (isRedirectData(storageItem)) {
      localStorage.removeItem(storageKey);
      i--; // Decrement teh counter
    }
  }
}

/**
 * Checks to ensure that the provided data matches the IRedirectData interface (e.g., this is a typegaurd)
 * @param data the data to check
 */
function isRedirectData(data: unknown): boolean {
  const redirectData = data as IRedirectData; // Cast the data

  // Validate that we have the proper data
  return (
    redirectData.state !== undefined && redirectData.expiresOn !== undefined
  );
}

/**
 * Interface that stores redirect data, including the path to redirect to
 * and the expiry for that path. Meant to be used internally and stored in local storage
 */
interface IRedirectData {
  /**
   * The desired redirect data
   */
  state: Record<string, unknown>;

  /**
   * The time from the epoch in ms that this redirect attempt expires
   */
  expiresOn: number;
}

/**
 * Data that will be returned from a successful redirect attempt
 */
interface IRedirectReturn {
  /**
   * The desired redirect data
   */
  state: Record<string, unknown>;

  /**
   * The returned OAuth code
   */
  code: string;
}