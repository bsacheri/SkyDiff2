import { PROVIDERS, PROVIDER_STATUS } from "./forecast-core.js";

export function getProviderDescriptors() {
  return PROVIDERS.map((provider) => ({
    ...provider,
    status: provider.id === "forecastpro" || provider.id === "wxdata" || provider.id === "weatherdb"
      ? PROVIDER_STATUS.SETUP_REQUIRED
      : PROVIDER_STATUS.ACTIVE
  }));
}
