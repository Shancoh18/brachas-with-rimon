/**
 * Social sign-in (Apple / Google) via @capgo/capacitor-social-login.
 *
 * The plugin covers all platforms: on iOS Apple uses the native
 * ASAuthorization sheet (no client id needed) and Google uses the iOS SDK;
 * on the web Google uses Google Identity Services with the web client id.
 * Apple on the web needs an Apple Service ID + verified domain, which we
 * don't have — so the Apple button is native-only.
 *
 * The buttons only render where the flow can actually succeed:
 *   Apple  → native iOS always.
 *   Google → whenever the matching client id env var is present.
 * The server does the real verification (/api/oauth) — the client only
 * forwards the provider's identity token.
 */
import { SocialLogin } from '@capgo/capacitor-social-login';
import { isNative } from './native';

const GOOGLE_IOS_CLIENT_ID = import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID as string | undefined;
const GOOGLE_WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as string | undefined;

export const appleAvailable = () => isNative();
export const googleAvailable = () => (isNative() ? !!GOOGLE_IOS_CLIENT_ID : !!GOOGLE_WEB_CLIENT_ID);

let initialized = false;
async function init() {
  if (initialized) return;
  await SocialLogin.initialize({
    apple: {},
    ...(googleAvailable()
      ? { google: { iOSClientId: GOOGLE_IOS_CLIENT_ID, webClientId: GOOGLE_WEB_CLIENT_ID } }
      : {}),
  });
  initialized = true;
}

export interface SocialIdentity {
  idToken: string;
  /** Only present the first time Apple shares it — forward to the server. */
  name?: string;
}

export async function loginWithApple(): Promise<SocialIdentity> {
  await init();
  const { result } = await SocialLogin.login({
    provider: 'apple',
    options: { scopes: ['email', 'name'] },
  });
  if (!result.idToken) throw new Error('apple_no_token');
  const given = result.profile?.givenName ?? '';
  const family = result.profile?.familyName ?? '';
  const name = `${given} ${family}`.trim();
  return { idToken: result.idToken, ...(name ? { name } : {}) };
}

export async function loginWithGoogle(): Promise<SocialIdentity> {
  await init();
  const { result } = await SocialLogin.login({
    provider: 'google',
    options: { scopes: ['email', 'profile'] },
  });
  if (!('idToken' in result) || !result.idToken) throw new Error('google_no_token');
  const name = ('profile' in result && result.profile?.name) || '';
  return { idToken: result.idToken, ...(name ? { name } : {}) };
}
