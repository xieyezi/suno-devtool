import * as i18n from "../../../core/i18n/i18n.js";
const UIStrings = {
  Activated: "Activated.",
  Destroyed: "A prerendered page was abandoned for unknown reasons.",
  LowEndDevice: "Prerendering is not supported for low-memory devices.",
  InvalidSchemeRedirect: "Attempted to prerender a URL that redirected to a non-HTTP(S) URL. Only HTTP(S) pages can be prerendered.",
  InvalidSchemeNavigation: "Only HTTP(S) navigation allowed for Prerender.",
  InProgressNavigation: "InProgressNavigation.",
  NavigationRequestBlockedByCsp: "Navigation request is blocked by CSP.",
  MainFrameNavigation: "Navigations after the initial prerendering navigation are disallowed",
  MojoBinderPolicy: "A disallowed API was used by the prerendered page",
  RendererProcessCrashed: "The prerendered page crashed.",
  RendererProcessKilled: "The renderer process for the prerendering page was killed.",
  Download: "Download is disallowed in Prerender.",
  TriggerDestroyed: "Prerender is not activated and destroyed with the trigger.",
  NavigationNotCommitted: "The prerendering page is not committed in the end.",
  NavigationBadHttpStatus: "The initial prerendering navigation was not successful due to the server returning a non-200/204/205 status code.",
  ClientCertRequested: "The page is requesting client cert, which is not suitable for a hidden page like prerendering.",
  NavigationRequestNetworkError: "Encountered a network error during prerendering.",
  MaxNumOfRunningPrerendersExceeded: "Max number of prerendering exceeded.",
  CancelAllHostsForTesting: "CancelAllHostsForTesting.",
  DidFailLoad: "DidFailLoadWithError happened during prerendering.",
  Stop: "The tab is stopped.",
  SslCertificateError: "SSL certificate error.",
  LoginAuthRequested: "Prerender does not support auth requests from UI.",
  UaChangeRequiresReload: "Reload is needed after UserAgentOverride.",
  BlockedByClient: "Resource load is blocked by the client.",
  AudioOutputDeviceRequested: "Prerendering has not supported the AudioContext API yet.",
  MixedContent: "Prerendering is canceled by a mixed content frame.",
  TriggerBackgrounded: "The tab is in the background",
  EmbedderTriggeredAndSameOriginRedirected: "Prerendering triggered by Chrome internal (e.g., Omnibox prerendering) is canceled because the navigation is redirected to another same-origin page.",
  EmbedderTriggeredAndCrossOriginRedirected: "Prerendering triggered by Chrome internal (e.g., Omnibox prerendering) is is canceled because the navigation is redirected to another cross-origin page.",
  MemoryLimitExceeded: "Memory limit exceeded",
  FailToGetMemoryUsage: "Fail to get memory usage",
  DataSaverEnabled: "Data saver enabled",
  HasEffectiveUrl: "Has effective URL",
  ActivatedBeforeStarted: "Activated before started",
  InactivePageRestriction: "Inactive page restriction",
  StartFailed: "Start failed",
  DisallowedApiMethod: "Disallowed API method",
  PrerenderingOngoing: "Prerendering ongoing",
  CrossSiteRedirect: "Attempted to prerender a URL which redirected to a cross-site URL. Currently prerendering cross-site pages is disallowed.",
  CrossSiteNavigation: "The prerendered page navigated to a cross-site URL after loading. Currently prerendering cross-site pages is disallowed.",
  SameSiteCrossOriginRedirect: "Attempted to prerender a URL which redirected to a same-site cross-origin URL. Currently prerendering cross-origin pages is disallowed.",
  SameSiteCrossOriginNavigation: "The prerendered page navigated to a same-site cross-origin URL after loading. Currently prerendering cross-origin pages is disallowed.",
  SameSiteCrossOriginRedirectNotOptIn: "Attempted to prerender a URL which redirected to a same-site cross-origin URL. This is disallowed unless the destination site sends a Supports-Loading-Mode: credentialed-prerender header.",
  SameSiteCrossOriginNavigationNotOptIn: "The prerendered page navigated to a same-site cross-origin URL after loading. This is disallowed unless the destination site sends a Supports-Loading-Mode: credentialed-prerender header.",
  ActivationNavigationParameterMismatch: "The page was prerendered, but the navigation ended up being performed differently than the original prerender, so the prerendered page could not be activated."
};
const str_ = i18n.i18n.registerUIStrings("panels/application/components/Prerender2.ts", UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(void 0, str_);
export const Prerender2ReasonDescription = {
  "Activated": { name: i18nLazyString(UIStrings.Activated) },
  "Destroyed": { name: i18nLazyString(UIStrings.Destroyed) },
  "LowEndDevice": { name: i18nLazyString(UIStrings.LowEndDevice) },
  "InvalidSchemeRedirect": { name: i18nLazyString(UIStrings.InvalidSchemeRedirect) },
  "InvalidSchemeNavigation": { name: i18nLazyString(UIStrings.InvalidSchemeNavigation) },
  "InProgressNavigation": { name: i18nLazyString(UIStrings.InProgressNavigation) },
  "NavigationRequestBlockedByCsp": { name: i18nLazyString(UIStrings.NavigationRequestBlockedByCsp) },
  "MainFrameNavigation": { name: i18nLazyString(UIStrings.MainFrameNavigation) },
  "MojoBinderPolicy": { name: i18nLazyString(UIStrings.MojoBinderPolicy) },
  "RendererProcessCrashed": { name: i18nLazyString(UIStrings.RendererProcessCrashed) },
  "RendererProcessKilled": { name: i18nLazyString(UIStrings.RendererProcessKilled) },
  "Download": { name: i18nLazyString(UIStrings.Download) },
  "TriggerDestroyed": { name: i18nLazyString(UIStrings.TriggerDestroyed) },
  "NavigationNotCommitted": { name: i18nLazyString(UIStrings.NavigationNotCommitted) },
  "NavigationBadHttpStatus": { name: i18nLazyString(UIStrings.NavigationBadHttpStatus) },
  "ClientCertRequested": { name: i18nLazyString(UIStrings.ClientCertRequested) },
  "NavigationRequestNetworkError": { name: i18nLazyString(UIStrings.NavigationRequestNetworkError) },
  "MaxNumOfRunningPrerendersExceeded": { name: i18nLazyString(UIStrings.MaxNumOfRunningPrerendersExceeded) },
  "CancelAllHostsForTesting": { name: i18nLazyString(UIStrings.CancelAllHostsForTesting) },
  "DidFailLoad": { name: i18nLazyString(UIStrings.DidFailLoad) },
  "Stop": { name: i18nLazyString(UIStrings.Stop) },
  "SslCertificateError": { name: i18nLazyString(UIStrings.SslCertificateError) },
  "LoginAuthRequested": { name: i18nLazyString(UIStrings.LoginAuthRequested) },
  "UaChangeRequiresReload": { name: i18nLazyString(UIStrings.UaChangeRequiresReload) },
  "BlockedByClient": { name: i18nLazyString(UIStrings.BlockedByClient) },
  "AudioOutputDeviceRequested": { name: i18nLazyString(UIStrings.AudioOutputDeviceRequested) },
  "MixedContent": { name: i18nLazyString(UIStrings.MixedContent) },
  "TriggerBackgrounded": { name: i18nLazyString(UIStrings.TriggerBackgrounded) },
  "EmbedderTriggeredAndSameOriginRedirected": { name: i18nLazyString(UIStrings.EmbedderTriggeredAndSameOriginRedirected) },
  "EmbedderTriggeredAndCrossOriginRedirected": { name: i18nLazyString(UIStrings.EmbedderTriggeredAndCrossOriginRedirected) },
  "MemoryLimitExceeded": { name: i18nLazyString(UIStrings.MemoryLimitExceeded) },
  "FailToGetMemoryUsage": { name: i18nLazyString(UIStrings.FailToGetMemoryUsage) },
  "DataSaverEnabled": { name: i18nLazyString(UIStrings.DataSaverEnabled) },
  "HasEffectiveUrl": { name: i18nLazyString(UIStrings.HasEffectiveUrl) },
  "ActivatedBeforeStarted": { name: i18nLazyString(UIStrings.ActivatedBeforeStarted) },
  "InactivePageRestriction": { name: i18nLazyString(UIStrings.InactivePageRestriction) },
  "StartFailed": { name: i18nLazyString(UIStrings.StartFailed) },
  "DisallowedApiMethod": { name: i18nLazyString(UIStrings.DisallowedApiMethod) },
  "PrerenderingOngoing": { name: i18nLazyString(UIStrings.PrerenderingOngoing) },
  "CrossSiteRedirect": { name: i18nLazyString(UIStrings.CrossSiteRedirect) },
  "CrossSiteNavigation": { name: i18nLazyString(UIStrings.CrossSiteNavigation) },
  "SameSiteCrossOriginRedirect": { name: i18nLazyString(UIStrings.SameSiteCrossOriginRedirect) },
  "SameSiteCrossOriginNavigation": { name: i18nLazyString(UIStrings.SameSiteCrossOriginNavigation) },
  "SameSiteCrossOriginRedirectNotOptIn": { name: i18nLazyString(UIStrings.SameSiteCrossOriginRedirectNotOptIn) },
  "SameSiteCrossOriginNavigationNotOptIn": { name: i18nLazyString(UIStrings.SameSiteCrossOriginNavigationNotOptIn) },
  "ActivationNavigationParameterMismatch": { name: i18nLazyString(UIStrings.ActivationNavigationParameterMismatch) }
};
//# sourceMappingURL=Prerender2.js.map
