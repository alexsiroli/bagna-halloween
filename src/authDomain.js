// Sul dominio proprio il login passa same-origin dal proxy /__/auth/* di netlify.toml;
// ovunque altro (netlify.app, deploy preview, localhost, emulatore) vale la variabile.
export const CUSTOM_DOMAIN = 'halloween.alxstudio.it';

export function resolveAuthDomain(hostname, envValue) {
  return hostname === CUSTOM_DOMAIN ? CUSTOM_DOMAIN : envValue;
}
