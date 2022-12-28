import * as Host from "../../core/host/host.js";
import * as i18n from "../../core/i18n/i18n.js";
import * as IssuesManager from "../../models/issues_manager/issues_manager.js";
import { AffectedItem, AffectedResourcesView } from "./AffectedResourcesView.js";
const UIStrings = {
  nViolations: "{n, plural, =1 {# violation} other {# violations}}",
  element: "Element",
  invalidHeaderValue: "Invalid Header Value",
  maximumConcurrentRegistrations: "Maximum Concurrent Registrations",
  request: "Request",
  untrustworthyOrigin: "Untrustworthy origin"
};
const str_ = i18n.i18n.registerUIStrings("panels/issues/AttributionReportingIssueDetailsView.ts", UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
export class AttributionReportingIssueDetailsView extends AffectedResourcesView {
  getResourceNameWithCount(count) {
    return i18nString(UIStrings.nViolations, { n: count });
  }
  update() {
    this.clear();
    const issues = this.issue.getAttributionReportingIssues();
    if (issues.size > 0) {
      this.#appendDetails(issues.values().next().value.code(), issues);
    } else {
      this.updateAffectedResourceCount(0);
    }
  }
  #appendDetails(issueCode, issues) {
    const header = document.createElement("tr");
    switch (issueCode) {
      case IssuesManager.AttributionReportingIssue.IssueCode.InvalidRegisterSourceHeader:
      case IssuesManager.AttributionReportingIssue.IssueCode.InvalidRegisterTriggerHeader:
      case IssuesManager.AttributionReportingIssue.IssueCode.InvalidEligibleHeader:
      case IssuesManager.AttributionReportingIssue.IssueCode.SourceIgnored:
      case IssuesManager.AttributionReportingIssue.IssueCode.TriggerIgnored:
        this.appendColumnTitle(header, i18nString(UIStrings.request));
        this.appendColumnTitle(header, i18nString(UIStrings.invalidHeaderValue));
        break;
      case IssuesManager.AttributionReportingIssue.IssueCode.InsecureContext:
      case IssuesManager.AttributionReportingIssue.IssueCode.UntrustworthyReportingOrigin:
        this.appendColumnTitle(header, i18nString(UIStrings.element));
        this.appendColumnTitle(header, i18nString(UIStrings.request));
        this.appendColumnTitle(header, i18nString(UIStrings.untrustworthyOrigin));
        break;
      case IssuesManager.AttributionReportingIssue.IssueCode.PermissionPolicyDisabled:
      case IssuesManager.AttributionReportingIssue.IssueCode.PermissionPolicyNotDelegated:
        this.appendColumnTitle(header, i18nString(UIStrings.element));
        this.appendColumnTitle(header, i18nString(UIStrings.request));
        break;
      case IssuesManager.AttributionReportingIssue.IssueCode.TooManyConcurrentRequests:
        this.appendColumnTitle(header, i18nString(UIStrings.element));
        this.appendColumnTitle(header, i18nString(UIStrings.maximumConcurrentRegistrations));
        break;
      case IssuesManager.AttributionReportingIssue.IssueCode.SourceAndTriggerHeaders:
        this.appendColumnTitle(header, i18nString(UIStrings.request));
        break;
    }
    this.affectedResources.appendChild(header);
    let count = 0;
    for (const issue of issues) {
      count++;
      void this.#appendDetail(issueCode, issue);
    }
    this.updateAffectedResourceCount(count);
  }
  async #appendDetail(issueCode, issue) {
    const element = document.createElement("tr");
    element.classList.add("affected-resource-directive");
    const details = issue.issueDetails;
    switch (issueCode) {
      case IssuesManager.AttributionReportingIssue.IssueCode.InvalidRegisterSourceHeader:
      case IssuesManager.AttributionReportingIssue.IssueCode.InvalidRegisterTriggerHeader:
      case IssuesManager.AttributionReportingIssue.IssueCode.InvalidEligibleHeader:
      case IssuesManager.AttributionReportingIssue.IssueCode.SourceIgnored:
      case IssuesManager.AttributionReportingIssue.IssueCode.TriggerIgnored:
        this.#appendRequestOrEmptyCell(element, details.request);
        this.appendIssueDetailCell(element, details.invalidParameter || "");
        break;
      case IssuesManager.AttributionReportingIssue.IssueCode.InsecureContext:
      case IssuesManager.AttributionReportingIssue.IssueCode.UntrustworthyReportingOrigin:
        await this.#appendElementOrEmptyCell(element, issue);
        this.#appendRequestOrEmptyCell(element, details.request);
        this.appendIssueDetailCell(element, details.invalidParameter || "");
        break;
      case IssuesManager.AttributionReportingIssue.IssueCode.PermissionPolicyDisabled:
      case IssuesManager.AttributionReportingIssue.IssueCode.PermissionPolicyNotDelegated:
        await this.#appendElementOrEmptyCell(element, issue);
        this.#appendRequestOrEmptyCell(element, details.request);
        break;
      case IssuesManager.AttributionReportingIssue.IssueCode.TooManyConcurrentRequests:
        await this.#appendElementOrEmptyCell(element, issue);
        this.appendIssueDetailCell(element, details.invalidParameter || "");
        break;
      case IssuesManager.AttributionReportingIssue.IssueCode.SourceAndTriggerHeaders:
        this.#appendRequestOrEmptyCell(element, details.request);
        break;
    }
    this.affectedResources.appendChild(element);
  }
  async #appendElementOrEmptyCell(parent, issue) {
    const details = issue.issueDetails;
    if (details.violatingNodeId !== void 0) {
      const target = issue.model()?.target() || null;
      parent.appendChild(await this.createElementCell({ backendNodeId: details.violatingNodeId, target, nodeName: "Attribution source element" }, issue.getCategory()));
    } else {
      this.appendIssueDetailCell(parent, "");
    }
  }
  #appendRequestOrEmptyCell(parent, request) {
    if (!request) {
      this.appendIssueDetailCell(parent, "");
      return;
    }
    const opts = {
      additionalOnClickAction() {
        Host.userMetrics.issuesPanelResourceOpened(IssuesManager.Issue.IssueCategory.AttributionReporting, AffectedItem.Request);
      }
    };
    parent.appendChild(this.createRequestCell(request, opts));
  }
}
//# sourceMappingURL=AttributionReportingIssueDetailsView.js.map
