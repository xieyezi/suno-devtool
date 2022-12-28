import * as Common from "../../../core/common/common.js";
import * as Host from "../../../core/host/host.js";
import * as i18n from "../../../core/i18n/i18n.js";
import * as SDK from "../../../core/sdk/sdk.js";
import * as Protocol from "../../../generated/protocol.js";
import * as UI from "../../legacy/legacy.js";
import { Events as LmiEvents, LinearMemoryInspectorPaneImpl } from "./LinearMemoryInspectorPane.js";
import {
  Endianness,
  getDefaultValueTypeMapping
} from "./ValueInterpreterDisplayUtils.js";
import * as Bindings from "../../../models/bindings/bindings.js";
const UIStrings = {
  couldNotOpenLinearMemory: "Could not open linear memory inspector: failed locating buffer."
};
const str_ = i18n.i18n.registerUIStrings("ui/components/linear_memory_inspector/LinearMemoryInspectorController.ts", UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
const LINEAR_MEMORY_INSPECTOR_OBJECT_GROUP = "linear-memory-inspector";
const MEMORY_TRANSFER_MIN_CHUNK_SIZE = 1e3;
export const ACCEPTED_MEMORY_TYPES = ["webassemblymemory", "typedarray", "dataview", "arraybuffer"];
let controllerInstance;
export class RemoteArrayBufferWrapper {
  #remoteArrayBuffer;
  constructor(arrayBuffer) {
    this.#remoteArrayBuffer = arrayBuffer;
  }
  length() {
    return this.#remoteArrayBuffer.byteLength();
  }
  async getRange(start, end) {
    const newEnd = Math.min(end, this.length());
    if (start < 0 || start > newEnd) {
      console.error(`Requesting invalid range of memory: (${start}, ${end})`);
      return new Uint8Array(0);
    }
    const array = await this.#remoteArrayBuffer.bytes(start, newEnd);
    return new Uint8Array(array);
  }
}
async function getBufferFromObject(obj) {
  console.assert(obj.type === "object");
  console.assert(obj.subtype !== void 0 && ACCEPTED_MEMORY_TYPES.includes(obj.subtype));
  const response = await obj.runtimeModel().agent.invoke_callFunctionOn({
    objectId: obj.objectId,
    functionDeclaration: "function() { return this instanceof ArrayBuffer || (typeof SharedArrayBuffer !== 'undefined' && this instanceof SharedArrayBuffer) ? this : this.buffer; }",
    silent: true,
    objectGroup: LINEAR_MEMORY_INSPECTOR_OBJECT_GROUP
  });
  const error = response.getError();
  if (error) {
    throw new Error(`Remote object representing ArrayBuffer could not be retrieved: ${error}`);
  }
  obj = obj.runtimeModel().createRemoteObject(response.result);
  return new SDK.RemoteObject.RemoteArrayBuffer(obj);
}
export function isDWARFMemoryObject(obj) {
  if (obj instanceof Bindings.DebuggerLanguagePlugins.ValueNode) {
    return obj.inspectableAddress !== void 0;
  }
  if (obj instanceof Bindings.DebuggerLanguagePlugins.ExtensionRemoteObject) {
    return obj.linearMemoryAddress !== void 0;
  }
  return false;
}
export function isMemoryObjectProperty(obj) {
  const isWasmOrBuffer = obj.type === "object" && obj.subtype && ACCEPTED_MEMORY_TYPES.includes(obj.subtype);
  if (isWasmOrBuffer || isDWARFMemoryObject(obj)) {
    return true;
  }
  return false;
}
export class LinearMemoryInspectorController extends SDK.TargetManager.SDKModelObserver {
  #paneInstance = LinearMemoryInspectorPaneImpl.instance();
  #bufferIdToRemoteObject = /* @__PURE__ */ new Map();
  #bufferIdToHighlightInfo = /* @__PURE__ */ new Map();
  #settings;
  constructor() {
    super();
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.RuntimeModel.RuntimeModel, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.GlobalObjectCleared, this.#onGlobalObjectClear, this);
    this.#paneInstance.addEventListener(LmiEvents.ViewClosed, this.#viewClosed.bind(this));
    SDK.TargetManager.TargetManager.instance().addModelListener(SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, this.#onDebuggerPause, this);
    const defaultValueTypeModes = getDefaultValueTypeMapping();
    const defaultSettings = {
      valueTypes: Array.from(defaultValueTypeModes.keys()),
      valueTypeModes: Array.from(defaultValueTypeModes),
      endianness: Endianness.Little
    };
    this.#settings = Common.Settings.Settings.instance().createSetting("lmiInterpreterSettings", defaultSettings);
  }
  static instance() {
    if (controllerInstance) {
      return controllerInstance;
    }
    controllerInstance = new LinearMemoryInspectorController();
    return controllerInstance;
  }
  static async getMemoryForAddress(memoryWrapper, address) {
    const memoryChunkStart = Math.max(0, address - MEMORY_TRANSFER_MIN_CHUNK_SIZE / 2);
    const memoryChunkEnd = memoryChunkStart + MEMORY_TRANSFER_MIN_CHUNK_SIZE;
    const memory = await memoryWrapper.getRange(memoryChunkStart, memoryChunkEnd);
    return { memory, offset: memoryChunkStart };
  }
  static async getMemoryRange(memoryWrapper, start, end) {
    if (start < 0 || start > end || start >= memoryWrapper.length()) {
      throw new Error("Requested range is out of bounds.");
    }
    const chunkEnd = Math.max(end, start + MEMORY_TRANSFER_MIN_CHUNK_SIZE);
    return await memoryWrapper.getRange(start, chunkEnd);
  }
  async evaluateExpression(callFrame, expressionName) {
    const result = await callFrame.evaluate({ expression: expressionName });
    if ("error" in result) {
      console.error(`Tried to evaluate the expression '${expressionName}' but got an error: ${result.error}`);
      return void 0;
    }
    if ("exceptionDetails" in result && result?.exceptionDetails?.text) {
      console.error(`Tried to evaluate the expression '${expressionName}' but got an exception: ${result.exceptionDetails.text}`);
      return void 0;
    }
    return result.object;
  }
  saveSettings(data) {
    const valueTypes = Array.from(data.valueTypes);
    const modes = [...data.modes];
    this.#settings.set({ valueTypes, valueTypeModes: modes, endianness: data.endianness });
  }
  loadSettings() {
    const settings = this.#settings.get();
    return {
      valueTypes: new Set(settings.valueTypes),
      modes: new Map(settings.valueTypeModes),
      endianness: settings.endianness
    };
  }
  getHighlightInfo(bufferId) {
    return this.#bufferIdToHighlightInfo.get(bufferId);
  }
  removeHighlight(bufferId, highlightInfo) {
    const currentHighlight = this.getHighlightInfo(bufferId);
    if (currentHighlight === highlightInfo) {
      this.#bufferIdToHighlightInfo.delete(bufferId);
    }
  }
  setHighlightInfo(bufferId, highlightInfo) {
    this.#bufferIdToHighlightInfo.set(bufferId, highlightInfo);
  }
  #resetHighlightInfo(bufferId) {
    this.#bufferIdToHighlightInfo.delete(bufferId);
  }
  static async retrieveDWARFMemoryObjectAndAddress(obj) {
    if (obj instanceof Bindings.DebuggerLanguagePlugins.ExtensionRemoteObject) {
      const valueNode2 = obj;
      const address2 = obj.linearMemoryAddress;
      if (address2 === void 0) {
        return void 0;
      }
      const callFrame2 = valueNode2.callFrame;
      const response2 = await obj.debuggerModel().agent.invoke_evaluateOnCallFrame({
        callFrameId: callFrame2.id,
        expression: "memories[0]"
      });
      const error2 = response2.getError();
      if (error2) {
        console.error(error2);
        Common.Console.Console.instance().error(i18nString(UIStrings.couldNotOpenLinearMemory));
      }
      const runtimeModel2 = obj.debuggerModel().runtimeModel();
      return { obj: runtimeModel2.createRemoteObject(response2.result), address: address2 };
    }
    if (!(obj instanceof Bindings.DebuggerLanguagePlugins.ValueNode)) {
      return void 0;
    }
    const valueNode = obj;
    const address = valueNode.inspectableAddress || 0;
    const callFrame = valueNode.callFrame;
    const response = await obj.debuggerModel().agent.invoke_evaluateOnCallFrame({
      callFrameId: callFrame.id,
      expression: "memories[0]"
    });
    const error = response.getError();
    if (error) {
      console.error(error);
      Common.Console.Console.instance().error(i18nString(UIStrings.couldNotOpenLinearMemory));
    }
    const runtimeModel = obj.debuggerModel().runtimeModel();
    obj = runtimeModel.createRemoteObject(response.result);
    return { obj, address };
  }
  static extractObjectSize(obj) {
    if (obj instanceof Bindings.DebuggerLanguagePlugins.ExtensionRemoteObject) {
      return obj.linearMemorySize ?? 0;
    }
    let typeInfo = obj.sourceType.typeInfo;
    const pointerMembers = typeInfo.members.filter((member) => member.name === "*");
    if (pointerMembers.length === 1) {
      const typeId = pointerMembers[0].typeId;
      const newTypeInfo = obj.sourceType.typeMap.get(typeId)?.typeInfo;
      if (newTypeInfo !== void 0) {
        typeInfo = newTypeInfo;
      } else {
        throw new Error(`Cannot find the source type information for typeId ${typeId}.`);
      }
    } else if (pointerMembers.length > 1) {
      throw new Error("The number of pointers in typeInfo.members should not be greater than one.");
    }
    return typeInfo.size;
  }
  static extractObjectTypeDescription(obj) {
    const objType = obj.description;
    if (!objType) {
      return "";
    }
    const lastChar = objType.charAt(objType.length - 1);
    const secondToLastChar = objType.charAt(objType.length - 2);
    const isPointerType = lastChar === "*" || lastChar === "&";
    const isOneLevelPointer = secondToLastChar === " ";
    if (!isPointerType) {
      return objType;
    }
    if (isOneLevelPointer) {
      return objType.slice(0, objType.length - 2);
    }
    return objType.slice(0, objType.length - 1);
  }
  static extractObjectName(obj, expression) {
    const lastChar = obj.description?.charAt(obj.description.length - 1);
    const isPointerType = lastChar === "*";
    if (isPointerType) {
      return "*" + expression;
    }
    return expression;
  }
  async openInspectorView(obj, address, expression) {
    const response = await LinearMemoryInspectorController.retrieveDWARFMemoryObjectAndAddress(obj);
    let memoryObj = obj;
    let memoryAddress = address;
    if (response !== void 0) {
      memoryAddress = response.address;
      memoryObj = response.obj;
    }
    if (memoryAddress !== void 0) {
      Host.userMetrics.linearMemoryInspectorTarget(Host.UserMetrics.LinearMemoryInspectorTarget.DWARFInspectableAddress);
    } else if (memoryObj.subtype === Protocol.Runtime.RemoteObjectSubtype.Arraybuffer) {
      Host.userMetrics.linearMemoryInspectorTarget(Host.UserMetrics.LinearMemoryInspectorTarget.ArrayBuffer);
    } else if (memoryObj.subtype === Protocol.Runtime.RemoteObjectSubtype.Dataview) {
      Host.userMetrics.linearMemoryInspectorTarget(Host.UserMetrics.LinearMemoryInspectorTarget.DataView);
    } else if (memoryObj.subtype === Protocol.Runtime.RemoteObjectSubtype.Typedarray) {
      Host.userMetrics.linearMemoryInspectorTarget(Host.UserMetrics.LinearMemoryInspectorTarget.TypedArray);
    } else {
      console.assert(memoryObj.subtype === Protocol.Runtime.RemoteObjectSubtype.Webassemblymemory);
      Host.userMetrics.linearMemoryInspectorTarget(Host.UserMetrics.LinearMemoryInspectorTarget.WebAssemblyMemory);
    }
    const buffer = await getBufferFromObject(memoryObj);
    const { internalProperties } = await buffer.object().getOwnProperties(false);
    const idProperty = internalProperties?.find(({ name }) => name === "[[ArrayBufferData]]");
    const id = idProperty?.value?.value;
    if (!id) {
      throw new Error("Unable to find backing store id for array buffer");
    }
    const memoryProperty = internalProperties?.find(({ name }) => name === "[[WebAssemblyMemory]]");
    const memory = memoryProperty?.value;
    const highlightInfo = LinearMemoryInspectorController.extractHighlightInfo(obj, expression);
    if (highlightInfo) {
      this.setHighlightInfo(id, highlightInfo);
    } else {
      this.#resetHighlightInfo(id);
    }
    if (this.#bufferIdToRemoteObject.has(id)) {
      this.#paneInstance.reveal(id, memoryAddress);
      void UI.ViewManager.ViewManager.instance().showView("linear-memory-inspector");
      return;
    }
    const title = String(memory ? memory.description : buffer.object().description);
    this.#bufferIdToRemoteObject.set(id, buffer.object());
    const arrayBufferWrapper = new RemoteArrayBufferWrapper(buffer);
    this.#paneInstance.create(id, title, arrayBufferWrapper, memoryAddress);
    void UI.ViewManager.ViewManager.instance().showView("linear-memory-inspector");
  }
  static extractHighlightInfo(obj, expression) {
    if (!(obj instanceof Bindings.DebuggerLanguagePlugins.ValueNode) && !(obj instanceof Bindings.DebuggerLanguagePlugins.ExtensionRemoteObject)) {
      return void 0;
    }
    const startAddress = (obj instanceof Bindings.DebuggerLanguagePlugins.ExtensionRemoteObject ? obj.linearMemoryAddress : obj.inspectableAddress) ?? 0;
    let highlightInfo;
    try {
      highlightInfo = {
        startAddress,
        size: LinearMemoryInspectorController.extractObjectSize(obj),
        name: expression ? LinearMemoryInspectorController.extractObjectName(obj, expression) : expression,
        type: LinearMemoryInspectorController.extractObjectTypeDescription(obj)
      };
    } catch (err) {
      highlightInfo = void 0;
    }
    return highlightInfo;
  }
  modelRemoved(model) {
    for (const [bufferId, remoteObject] of this.#bufferIdToRemoteObject) {
      if (model === remoteObject.runtimeModel()) {
        this.#bufferIdToRemoteObject.delete(bufferId);
        this.#resetHighlightInfo(bufferId);
        this.#paneInstance.close(bufferId);
      }
    }
  }
  #onDebuggerPause(event) {
    const debuggerModel = event.data;
    for (const [bufferId, remoteObject] of this.#bufferIdToRemoteObject) {
      if (debuggerModel.runtimeModel() === remoteObject.runtimeModel()) {
        const topCallFrame = debuggerModel.debuggerPausedDetails()?.callFrames[0];
        if (topCallFrame) {
          void this.updateHighlightedMemory(bufferId, topCallFrame).then(() => this.#paneInstance.refreshView(bufferId));
        } else {
          this.#resetHighlightInfo(bufferId);
          this.#paneInstance.refreshView(bufferId);
        }
      }
    }
  }
  #onGlobalObjectClear(event) {
    this.modelRemoved(event.data.runtimeModel());
  }
  #viewClosed({ data: bufferId }) {
    const remoteObj = this.#bufferIdToRemoteObject.get(bufferId);
    if (remoteObj) {
      remoteObj.release();
    }
    this.#bufferIdToRemoteObject.delete(bufferId);
    this.#resetHighlightInfo(bufferId);
  }
  async updateHighlightedMemory(bufferId, callFrame) {
    const oldHighlightInfo = this.getHighlightInfo(bufferId);
    const expressionName = oldHighlightInfo?.name;
    if (!oldHighlightInfo || !expressionName) {
      this.#resetHighlightInfo(bufferId);
      return;
    }
    const obj = await this.evaluateExpression(callFrame, expressionName);
    if (!obj) {
      this.#resetHighlightInfo(bufferId);
      return;
    }
    const newHighlightInfo = LinearMemoryInspectorController.extractHighlightInfo(obj, expressionName);
    if (!newHighlightInfo || !this.#pointToSameMemoryObject(newHighlightInfo, oldHighlightInfo)) {
      this.#resetHighlightInfo(bufferId);
    } else {
      this.setHighlightInfo(bufferId, newHighlightInfo);
    }
  }
  #pointToSameMemoryObject(highlightInfoA, highlightInfoB) {
    return highlightInfoA.type === highlightInfoB.type && highlightInfoA.startAddress === highlightInfoB.startAddress;
  }
}
//# sourceMappingURL=LinearMemoryInspectorController.js.map
