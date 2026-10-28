// Credentials resolution.
//
// v1 (this skeleton): API key from the environment.
//   MONEI_API_KEY       live or test key (the key itself decides the mode)
//   MONEI_TEST_API_KEY  used instead when --test is passed
//
// TODO(v1): `monei login` — OAuth loopback through the MONEI broker
// (authorization-service). Register the CLI as a client via CIMD and ask for
// the verified tier. Store the refresh token in ~/.config/monei/ (OS keychain
// when available) and refresh the 15-minute access tokens transparently.
// TODO(v1.1): device flow (needs a device endpoint in authorization-service).

export type Credentials = { kind: "api-key"; apiKey: string; test: boolean };

export class AuthError extends Error {}

export function resolveCredentials(opts: { test?: boolean }, env = process.env): Credentials {
  const apiKey = opts.test ? env.MONEI_TEST_API_KEY ?? env.MONEI_API_KEY : env.MONEI_API_KEY;
  if (!apiKey) {
    throw new AuthError(
      opts.test
        ? "No API key. Set MONEI_TEST_API_KEY (or MONEI_API_KEY with a test key)."
        : "No API key. Set MONEI_API_KEY. (`monei login` with OAuth is coming.)",
    );
  }
  return { kind: "api-key", apiKey, test: apiKey.startsWith("pk_test_") };
}
