import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/user.model.js';
import config from '../config/index.js';

/**
 * PASSPORT GOOGLE OAUTH STRATEGY
 *
 * How the flow works end-to-end:
 *
 *   1. User clicks "Sign in with Google" on the frontend.
 *   2. Frontend navigates to GET /api/v1/auth/google (backend route).
 *   3. Passport redirects the browser to Google's OAuth consent screen.
 *   4. User grants permission. Google redirects back to our callbackUrl
 *      with a temporary `code` in the query string.
 *   5. Passport exchanges that `code` for an access token with Google's API.
 *   6. Google returns the user's profile (email, name, Google ID, avatar).
 *   7. Our "verify callback" (below) runs with that profile data.
 *   8. We upsert a User document in MongoDB and call done(null, user).
 *   9. The auth.routes.js callback handler issues our JWTs and redirects
 *      the browser to the frontend with the accessToken in the URL.
 *
 * Why "upsert" (findOne or create) instead of just create?
 * - A user might sign in with Google the first time → we create the account.
 * - The same user signs in with Google again next week → we find the existing
 *   account and just return it (no duplicate accounts).
 * - A user might have registered with email AND later tries Google with the
 *   same email → we link the accounts together (see `oauthProvider` field).
 *
 * Why not store the Google access token?
 * - We don't need it. We only use Google to verify identity (get the email
 *   and name). All subsequent API calls use our own JWT system.
 *   Storing Google's token would be scope creep and a security liability.
 */

// ─── Configure the Google OAuth Strategy ─────────────────────────────────────

// Register the strategy only when both credentials are present.
// Simple truthy check — no brittle hardcoded placeholder strings.
if (config.google.clientId && config.google.clientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        // These values come from Google Cloud Console → APIs & Services → Credentials
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        // Must match EXACTLY what's registered in Google Console (including protocol and path)
        callbackURL: config.google.callbackUrl,
      },

      /**
       * Verify callback — runs after Google successfully authenticates the user.
       *
       * @param {string} accessToken  - Google's access token (we don't store this)
       * @param {string} refreshToken - Google's refresh token (we don't store this)
       * @param {Object} profile      - The user's Google profile data
       * @param {Function} done       - Passport's callback: done(error, user)
       *
       * profile contains:
       *   - profile.id          → Google's unique user ID
       *   - profile.displayName → "Vikrant Sharma"
       *   - profile.emails[0].value → "vikrant@gmail.com"
       *   - profile.photos[0].value → Google profile photo URL
       */
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Extract the data we care about from the Google profile
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value;
          const name = profile.displayName;
          const avatar = profile.photos?.[0]?.value;

          if (!email) {
            // Google profile must have an email — if not (rare edge case), fail gracefully
            return done(new Error('No email address returned from Google'), null);
          }

          // ── Upsert logic: find or create the user ──────────────────────────

          // First: look for an existing account linked to this Google ID
          let user = await User.findOne({ oauthProvider: 'google', oauthId: googleId });

          if (!user) {
            // Second: look for an existing account with the same email
            // (user might have registered with email+password before trying Google)
            user = await User.findOne({ email });

            if (user) {
              // Link the existing account to Google OAuth
              user.oauthProvider = 'google';
              user.oauthId = googleId;
              // Update avatar only if they don't already have a custom one
              if (!user.avatar) user.avatar = avatar;
              await user.save();
            } else {
              // First time ever — create a brand new account
              // Note: no password is set for OAuth accounts (password field stays undefined)
              // They can't log in with email+password unless they explicitly set a password later
              user = await User.create({
                name,
                email,
                avatar,
                oauthProvider: 'google',
                oauthId: googleId,
                isVerified: true, // Google has already verified their email
                // role defaults to 'member' as defined in the User schema
              });
            }
          }

          // Pass the user to the route handler (done(null, user) = success)
          return done(null, user);
        } catch (error) {
          // Pass any DB errors back to passport (done(error) = fail)
          return done(error, null);
        }
      }
    )
  );
  console.log('✅ Google OAuth strategy registered');
} else {
  // Credentials not configured yet — log a clear message so the developer knows
  console.warn(
    '⚠️  Google OAuth credentials not configured. ' +
    'Fill in GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env to enable Google sign-in.'
  );
}

/**
 * Initialize passport — call this in app.js before the routes.
 *
 * We use passport in "stateless" mode: no session, no serialization.
 * Why? Our app uses JWTs, not server-side sessions. After the OAuth callback
 * succeeds, we issue our own JWT and the user logs in with that going forward.
 * Passport's built-in session support is unnecessary and we don't initialize it.
 */
export const initializePassport = () => {
  return passport.initialize();
};

export default passport;
