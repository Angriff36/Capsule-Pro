import { EventEmitter as NodeEventEmitter } from "node:events";
export class AgentEventEmitter {
  emitter;
  constructor() {
    this.emitter = new NodeEventEmitter();
    this.emitter.setMaxListeners(100);
  }
  on(event, listener) {
    this.emitter.on(event, listener);
    return this;
  }
  once(event, listener) {
    this.emitter.once(event, listener);
    return this;
  }
  off(event, listener) {
    this.emitter.off(event, listener);
    return this;
  }
  emit(event, eventObject) {
    return this.emitter.emit(event, eventObject);
  }
  onStarted(listener) {
    this.emitter.on("started", listener);
    return this;
  }
  onProgress(listener) {
    this.emitter.on("progress", listener);
    return this;
  }
  onCompleted(listener) {
    this.emitter.on("completed", listener);
    return this;
  }
  onError(listener) {
    this.emitter.on("error", listener);
    return this;
  }
  onCancelled(listener) {
    this.emitter.on("cancelled", listener);
    return this;
  }
  onToolStarted(listener) {
    this.emitter.on("toolStarted", listener);
    return this;
  }
  onToolProgress(listener) {
    this.emitter.on("toolProgress", listener);
    return this;
  }
  onToolCompleted(listener) {
    this.emitter.on("toolCompleted", listener);
    return this;
  }
  onToolError(listener) {
    this.emitter.on("toolError", listener);
    return this;
  }
  removeAllListeners() {
    this.emitter.removeAllListeners();
    return this;
  }
}
