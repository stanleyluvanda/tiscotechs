// Reuse the existing ScholarsKnowledge SuperTokens session.
// This module does not initialize authentication or create sessions.
/*import Session from "supertokens-web-js/recipe/session";

export const ScholarsAuthSession = {
  doesSessionExist: () => Session.doesSessionExist(),

  getUserId: () => Session.getUserId(),

  getAccessToken: async () => {
    const exists = await Session.doesSessionExist();
    return exists ? Session.getAccessToken() : null;
  },
};*/
// Reuse the existing ScholarsKnowledge SuperTokens session.
// This module does not initialize authentication or create sessions.
import Session from "supertokens-web-js/recipe/session";

export const ScholarsAuthSession = {
  doesSessionExist: () => Session.doesSessionExist(),

  getUserId: () => Session.getUserId(),

  getAccessToken: async () => {
    const exists = await Session.doesSessionExist();
    return exists ? Session.getAccessToken() : null;
  },

  attemptRefreshingSession: () =>
    Session.attemptRefreshingSession(),

  signOut: () => Session.signOut(),
};