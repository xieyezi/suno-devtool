import * as Root from "../../core/root/root.js";
import * as PuppeteerService from "../../services/puppeteer/puppeteer.js";
function disableLoggingForTest() {
  console.log = () => void 0;
}
class LegacyPort {
  onMessage;
  onClose;
  on(eventName, callback) {
    if (eventName === "message") {
      this.onMessage = callback;
    } else if (eventName === "close") {
      this.onClose = callback;
    }
  }
  send(message) {
    notifyFrontendViaWorkerMessage("sendProtocolMessage", { message });
  }
  close() {
  }
}
class ConnectionProxy {
  sessionId;
  onMessage;
  onDisconnect;
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.onMessage = null;
    this.onDisconnect = null;
  }
  setOnMessage(onMessage) {
    this.onMessage = onMessage;
  }
  setOnDisconnect(onDisconnect) {
    this.onDisconnect = onDisconnect;
  }
  getOnDisconnect() {
    return this.onDisconnect;
  }
  getSessionId() {
    return this.sessionId;
  }
  sendRawMessage(message) {
    notifyFrontendViaWorkerMessage("sendProtocolMessage", { message });
  }
  async disconnect() {
    this.onDisconnect?.("force disconnect");
    this.onDisconnect = null;
    this.onMessage = null;
  }
}
const legacyPort = new LegacyPort();
let cdpConnection;
let endTimespan;
async function invokeLH(action, args) {
  if (Root.Runtime.Runtime.queryParam("isUnderTest")) {
    disableLoggingForTest();
    args.flags.maxWaitForLoad = 2 * 1e3;
  }
  self.listenForStatus((message) => {
    notifyFrontendViaWorkerMessage("statusUpdate", { message: message[1] });
  });
  let puppeteerHandle;
  try {
    if (action === "endTimespan") {
      if (!endTimespan) {
        throw new Error("Cannot end a timespan before starting one");
      }
      const result = await endTimespan();
      endTimespan = void 0;
      return result;
    }
    const locale = await fetchLocaleData(args.locales);
    const flags = args.flags;
    flags.logLevel = flags.logLevel || "info";
    flags.channel = "devtools";
    flags.locale = locale;
    if (action === "startTimespan" || action === "snapshot") {
      args.categoryIDs = args.categoryIDs.filter((c) => c !== "lighthouse-plugin-publisher-ads");
    }
    const config = args.config || self.createConfig(args.categoryIDs, flags.formFactor);
    const url = args.url;
    if (action === "navigation" && flags.legacyNavigation) {
      const connection = self.setUpWorkerConnection(legacyPort);
      return await self.runLighthouse(url, flags, config, connection);
    }
    const { mainFrameId, mainSessionId, targetInfos } = args;
    cdpConnection = new ConnectionProxy(mainSessionId);
    puppeteerHandle = await PuppeteerService.PuppeteerConnection.PuppeteerConnectionHelper.connectPuppeteerToConnection({
      connection: cdpConnection,
      mainFrameId,
      targetInfos,
      targetFilterCallback: (targetInfo) => !targetInfo.url.match(/^https:\/\/i0.devtools-frontend/),
      isPageTargetCallback: (targetInfo) => targetInfo.type === "page"
    });
    const { page } = puppeteerHandle;
    const configContext = {
      logLevel: flags.logLevel,
      settingsOverrides: flags
    };
    if (action === "snapshot") {
      return await self.runLighthouseSnapshot({ config, page, configContext, flags });
    }
    if (action === "startTimespan") {
      const timespan = await self.startLighthouseTimespan({ config, page, configContext, flags });
      endTimespan = timespan.endTimespan;
      return;
    }
    return await self.runLighthouseNavigation(url, { config, page, configContext, flags });
  } catch (err) {
    return {
      fatal: true,
      message: err.message,
      stack: err.stack
    };
  } finally {
    if (action !== "startTimespan") {
      puppeteerHandle?.browser.disconnect();
    }
  }
}
async function fetchLocaleData(locales) {
  const locale = self.lookupLocale(locales);
  if (locale === "en-US" || locale === "en") {
    return;
  }
  try {
    const remoteBase = Root.Runtime.getRemoteBase();
    let localeUrl;
    if (remoteBase && remoteBase.base) {
      localeUrl = `${remoteBase.base}third_party/lighthouse/locales/${locale}.json`;
    } else {
      localeUrl = new URL(`../../third_party/lighthouse/locales/${locale}.json`, import.meta.url).toString();
    }
    const timeoutPromise = new Promise((resolve, reject) => setTimeout(() => reject(new Error("timed out fetching locale")), 5e3));
    const localeData = await Promise.race([timeoutPromise, fetch(localeUrl).then((result) => result.json())]);
    self.registerLocaleData(locale, localeData);
    return locale;
  } catch (err) {
    console.error(err);
  }
  return;
}
function notifyFrontendViaWorkerMessage(action, args) {
  self.postMessage({ action, args });
}
async function onFrontendMessage(event) {
  const messageFromFrontend = event.data;
  switch (messageFromFrontend.action) {
    case "startTimespan":
    case "endTimespan":
    case "snapshot":
    case "navigation": {
      const result = await invokeLH(messageFromFrontend.action, messageFromFrontend.args);
      if (result && typeof result === "object") {
        if ("report" in result) {
          delete result.report;
        }
        if ("artifacts" in result) {
          result.artifacts.Timing = JSON.parse(JSON.stringify(result.artifacts.Timing));
        }
      }
      self.postMessage({ id: messageFromFrontend.id, result });
      break;
    }
    case "dispatchProtocolMessage": {
      cdpConnection?.onMessage?.(messageFromFrontend.args.message);
      legacyPort.onMessage?.(JSON.stringify(messageFromFrontend.args.message));
      break;
    }
    default: {
      throw new Error(`Unknown event: ${event.data}`);
    }
  }
}
self.onmessage = onFrontendMessage;
globalThis.global = self;
globalThis.global.isVinn = true;
globalThis.global.document = {};
globalThis.global.document.documentElement = {};
globalThis.global.document.documentElement.style = {
  WebkitAppearance: "WebkitAppearance"
};
//# sourceMappingURL=LighthouseWorkerService.js.map
