import * as Platform from "../../../core/platform/platform.js";
const SUMMARY_ELEMENT_SELECTOR = "summary";
const domNodeIsTree = (domNode) => {
  return domNode.getAttribute("role") === "tree";
};
const domNodeIsBreakpointItemNode = (domNode) => {
  return domNode.getAttribute("role") === "treeitem";
};
const domNodeIsPauseOnExceptionsNode = (domNode) => {
  return domNode.getAttribute("data-first-pause") !== null || domNode.getAttribute("data-last-pause") !== null;
};
const domNodeIsSummaryNode = (domNode) => {
  return !domNodeIsBreakpointItemNode(domNode);
};
const groupIsExpanded = (detailsElement) => {
  return detailsElement.getAttribute("open") !== null;
};
const getFirstBreakpointItemInGroup = (detailsElement) => {
  return detailsElement.querySelector("[data-first-breakpoint]");
};
const getLastBreakpointItemInGroup = (detailsElement) => {
  return detailsElement.querySelector("[data-last-breakpoint]");
};
const getNextGroupsSummaryNode = (detailsElement) => {
  const nextDetailsElement = getNextDetailsElement(detailsElement);
  if (nextDetailsElement && nextDetailsElement instanceof HTMLDetailsElement) {
    return nextDetailsElement?.querySelector("summary");
  }
  return null;
};
const getCurrentSummaryNode = (detailsElement) => {
  return detailsElement.querySelector(SUMMARY_ELEMENT_SELECTOR);
};
const getNextDetailsElement = (detailsElement) => {
  const nextDetailsElement = detailsElement.nextElementSibling;
  if (nextDetailsElement && nextDetailsElement instanceof HTMLDetailsElement) {
    return nextDetailsElement;
  }
  return null;
};
const getPreviousDetailsElement = (detailsElement) => {
  const previousDetailsElement = detailsElement.previousElementSibling;
  if (previousDetailsElement && previousDetailsElement instanceof HTMLDetailsElement) {
    return previousDetailsElement;
  }
  return null;
};
function findNextNodeForPauseOnExceptions(target, key) {
  console.assert(domNodeIsPauseOnExceptionsNode(target));
  let nextNode = null;
  switch (key) {
    case Platform.KeyboardUtilities.ArrowKey.UP: {
      const previousElementSibling = target.previousElementSibling;
      if (previousElementSibling instanceof HTMLElement) {
        nextNode = previousElementSibling;
        console.assert(domNodeIsPauseOnExceptionsNode(nextNode));
      }
      break;
    }
    case Platform.KeyboardUtilities.ArrowKey.DOWN: {
      const nextElementSibling = target.nextElementSibling;
      if (nextElementSibling instanceof HTMLElement) {
        if (domNodeIsTree(nextElementSibling)) {
          const detailsElement = nextElementSibling.querySelector("[data-first-group]");
          if (detailsElement) {
            nextNode = getCurrentSummaryNode(detailsElement);
          }
        } else {
          nextNode = nextElementSibling;
          console.assert(domNodeIsPauseOnExceptionsNode(nextNode));
        }
      }
      break;
    }
    default:
      break;
  }
  return nextNode;
}
export async function findNextNodeForKeyboardNavigation(target, key, setGroupExpandedStateCallback) {
  if (domNodeIsPauseOnExceptionsNode(target)) {
    return findNextNodeForPauseOnExceptions(target, key);
  }
  const detailsElement = target.parentElement;
  if (!detailsElement || !(detailsElement instanceof HTMLDetailsElement)) {
    throw new Error("The selected nodes should be direct children of an HTMLDetails element.");
  }
  let nextNode = null;
  switch (key) {
    case Platform.KeyboardUtilities.ArrowKey.LEFT: {
      if (domNodeIsSummaryNode(target)) {
        if (groupIsExpanded(detailsElement)) {
          await setGroupExpandedStateCallback(detailsElement, false);
        }
      } else {
        return getCurrentSummaryNode(detailsElement);
      }
      break;
    }
    case Platform.KeyboardUtilities.ArrowKey.RIGHT: {
      if (domNodeIsSummaryNode(target)) {
        if (groupIsExpanded(detailsElement)) {
          return getFirstBreakpointItemInGroup(detailsElement);
        }
        await setGroupExpandedStateCallback(detailsElement, true);
      }
      break;
    }
    case Platform.KeyboardUtilities.ArrowKey.DOWN: {
      if (domNodeIsSummaryNode(target)) {
        if (groupIsExpanded(detailsElement)) {
          nextNode = getFirstBreakpointItemInGroup(detailsElement);
        } else {
          nextNode = getNextGroupsSummaryNode(detailsElement);
        }
      } else {
        const nextSibling = target.nextElementSibling;
        if (nextSibling && nextSibling instanceof HTMLDivElement) {
          nextNode = nextSibling;
        } else {
          nextNode = getNextGroupsSummaryNode(detailsElement);
        }
      }
      break;
    }
    case Platform.KeyboardUtilities.ArrowKey.UP: {
      if (domNodeIsSummaryNode(target)) {
        const previousDetailsElement = getPreviousDetailsElement(detailsElement);
        if (previousDetailsElement) {
          if (groupIsExpanded(previousDetailsElement)) {
            nextNode = getLastBreakpointItemInGroup(previousDetailsElement);
          } else {
            nextNode = getCurrentSummaryNode(previousDetailsElement);
          }
        } else {
          const pauseOnExceptions = detailsElement.parentElement?.previousElementSibling;
          if (pauseOnExceptions instanceof HTMLElement) {
            nextNode = pauseOnExceptions;
          }
        }
      } else {
        const previousSibling = target.previousElementSibling;
        if (previousSibling instanceof HTMLElement) {
          nextNode = previousSibling;
        }
      }
      break;
    }
  }
  return nextNode;
}
//# sourceMappingURL=BreakpointsViewUtils.js.map
