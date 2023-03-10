export class SimpleHistoryManager {
  #entries;
  #activeEntryIndex;
  #coalescingReadonly;
  #historyDepth;
  constructor(historyDepth) {
    this.#entries = [];
    this.#activeEntryIndex = -1;
    this.#coalescingReadonly = 0;
    this.#historyDepth = historyDepth;
  }
  readOnlyLock() {
    ++this.#coalescingReadonly;
  }
  releaseReadOnlyLock() {
    --this.#coalescingReadonly;
  }
  getPreviousValidIndex() {
    if (this.empty()) {
      return -1;
    }
    let revealIndex = this.#activeEntryIndex - 1;
    while (revealIndex >= 0 && !this.#entries[revealIndex].valid()) {
      --revealIndex;
    }
    if (revealIndex < 0) {
      return -1;
    }
    return revealIndex;
  }
  getNextValidIndex() {
    let revealIndex = this.#activeEntryIndex + 1;
    while (revealIndex < this.#entries.length && !this.#entries[revealIndex].valid()) {
      ++revealIndex;
    }
    if (revealIndex >= this.#entries.length) {
      return -1;
    }
    return revealIndex;
  }
  readOnly() {
    return Boolean(this.#coalescingReadonly);
  }
  filterOut(filterOutCallback) {
    if (this.readOnly()) {
      return;
    }
    const filteredEntries = [];
    let removedBeforeActiveEntry = 0;
    for (let i = 0; i < this.#entries.length; ++i) {
      if (!filterOutCallback(this.#entries[i])) {
        filteredEntries.push(this.#entries[i]);
      } else if (i <= this.#activeEntryIndex) {
        ++removedBeforeActiveEntry;
      }
    }
    this.#entries = filteredEntries;
    this.#activeEntryIndex = Math.max(0, this.#activeEntryIndex - removedBeforeActiveEntry);
  }
  empty() {
    return !this.#entries.length;
  }
  active() {
    return this.empty() ? null : this.#entries[this.#activeEntryIndex];
  }
  push(entry) {
    if (this.readOnly()) {
      return;
    }
    if (!this.empty()) {
      this.#entries.splice(this.#activeEntryIndex + 1);
    }
    this.#entries.push(entry);
    if (this.#entries.length > this.#historyDepth) {
      this.#entries.shift();
    }
    this.#activeEntryIndex = this.#entries.length - 1;
  }
  canRollback() {
    return this.getPreviousValidIndex() >= 0;
  }
  canRollover() {
    return this.getNextValidIndex() >= 0;
  }
  rollback() {
    const revealIndex = this.getPreviousValidIndex();
    if (revealIndex === -1) {
      return false;
    }
    this.readOnlyLock();
    this.#activeEntryIndex = revealIndex;
    this.#entries[revealIndex].reveal();
    this.releaseReadOnlyLock();
    return true;
  }
  rollover() {
    const revealIndex = this.getNextValidIndex();
    if (revealIndex === -1) {
      return false;
    }
    this.readOnlyLock();
    this.#activeEntryIndex = revealIndex;
    this.#entries[revealIndex].reveal();
    this.releaseReadOnlyLock();
    return true;
  }
}
//# sourceMappingURL=SimpleHistoryManager.js.map
