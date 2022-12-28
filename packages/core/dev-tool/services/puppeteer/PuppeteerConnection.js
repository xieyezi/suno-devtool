import * as puppeteer from "../../third_party/puppeteer/puppeteer.js";
class Transport {
  #connection;
  #knownIds = /* @__PURE__ */ new Set();
  constructor(connection) {
    this.#connection = connection;
  }
  send(data) {
    const message = JSON.parse(data);
    this.#knownIds.add(message.id);
    this.#connection.sendRawMessage(data);
  }
  close() {
    void this.#connection.disconnect();
  }
  set onmessage(cb) {
    this.#connection.setOnMessage((message) => {
      const data = message;
      if (data.id && !this.#knownIds.has(data.id)) {
        return;
      }
      this.#knownIds.delete(data.id);
      if (!data.sessionId) {
        return;
      }
      return cb(JSON.stringify({
        ...data,
        sessionId: data.sessionId === this.#connection.getSessionId() ? void 0 : data.sessionId
      }));
    });
  }
  set onclose(cb) {
    const prev = this.#connection.getOnDisconnect();
    this.#connection.setOnDisconnect((reason) => {
      if (prev) {
        prev(reason);
      }
      if (cb) {
        cb();
      }
    });
  }
}
class PuppeteerConnection extends puppeteer.Connection {
  async onMessage(message) {
    const msgObj = JSON.parse(message);
    if (msgObj.sessionId && !this._sessions.has(msgObj.sessionId)) {
      return;
    }
    void super.onMessage(message);
  }
}
export class PuppeteerConnectionHelper {
  static async connectPuppeteerToConnection(options) {
    const { connection, mainFrameId, targetInfos, targetFilterCallback, isPageTargetCallback } = options;
    const transport = new Transport(connection);
    const puppeteerConnection = new PuppeteerConnection("", transport);
    const targetIdsForAutoAttachEmulation = targetInfos.filter(targetFilterCallback).map((t) => t.targetId);
    const browserPromise = puppeteer.Browser._create("chrome", puppeteerConnection, [], false, void 0, void 0, void 0, targetFilterCallback, isPageTargetCallback);
    const [, browser] = await Promise.all([
      Promise.all(targetIdsForAutoAttachEmulation.map((targetId) => puppeteerConnection._createSession({ targetId }, true))),
      browserPromise
    ]);
    const pages = await Promise.all(browser.browserContexts().map((ctx) => ctx.targets()).flat().filter((target) => target.type() === "page" || target.url().startsWith("devtools://")).map((target) => target.page()));
    const page = pages.filter((p) => p !== null).find((p) => p.mainFrame()._id === mainFrameId) || null;
    return { page, browser, puppeteerConnection };
  }
}
//# sourceMappingURL=PuppeteerConnection.js.map
