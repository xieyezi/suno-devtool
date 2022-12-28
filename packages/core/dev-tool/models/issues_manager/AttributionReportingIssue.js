import * as Protocol from "../../generated/protocol.js";
import { Issue, IssueCategory, IssueKind } from "./Issue.js";
export var IssueCode = /* @__PURE__ */ ((IssueCode2) => {
  IssueCode2["PermissionPolicyDisabled"] = "AttributionReportingIssue::PermissionPolicyDisabled";
  IssueCode2["PermissionPolicyNotDelegated"] = "AttributionReportingIssue::PermissionPolicyNotDelegated";
  IssueCode2["UntrustworthyReportingOrigin"] = "AttributionReportingIssue::UntrustworthyReportingOrigin";
  IssueCode2["InsecureContext"] = "AttributionReportingIssue::InsecureContext";
  IssueCode2["InvalidRegisterSourceHeader"] = "AttributionReportingIssue::InvalidRegisterSourceHeader";
  IssueCode2["InvalidRegisterTriggerHeader"] = "AttributionReportingIssue::InvalidRegisterTriggerHeader";
  IssueCode2["InvalidEligibleHeader"] = "AttributionReportingIssue::InvalidEligibleHeader";
  IssueCode2["TooManyConcurrentRequests"] = "AttributionReportingIssue::TooManyConcurrentRequests";
  IssueCode2["SourceAndTriggerHeaders"] = "AttributionReportingIssue::SourceAndTriggerHeaders";
  IssueCode2["SourceIgnored"] = "AttributionReportingIssue::SourceIgnored";
  IssueCode2["TriggerIgnored"] = "AttributionReportingIssue::TriggerIgnored";
  IssueCode2["Unknown"] = "AttributionReportingIssue::Unknown";
  return IssueCode2;
})(IssueCode || {});
function getIssueCode(details) {
  switch (details.violationType) {
    case Protocol.Audits.AttributionReportingIssueType.PermissionPolicyDisabled:
      return "AttributionReportingIssue::PermissionPolicyDisabled" /* PermissionPolicyDisabled */;
    case Protocol.Audits.AttributionReportingIssueType.PermissionPolicyNotDelegated:
      return "AttributionReportingIssue::PermissionPolicyNotDelegated" /* PermissionPolicyNotDelegated */;
    case Protocol.Audits.AttributionReportingIssueType.UntrustworthyReportingOrigin:
      return "AttributionReportingIssue::UntrustworthyReportingOrigin" /* UntrustworthyReportingOrigin */;
    case Protocol.Audits.AttributionReportingIssueType.InsecureContext:
      return "AttributionReportingIssue::InsecureContext" /* InsecureContext */;
    case Protocol.Audits.AttributionReportingIssueType.InvalidHeader:
      return "AttributionReportingIssue::InvalidRegisterSourceHeader" /* InvalidRegisterSourceHeader */;
    case Protocol.Audits.AttributionReportingIssueType.InvalidRegisterTriggerHeader:
      return "AttributionReportingIssue::InvalidRegisterTriggerHeader" /* InvalidRegisterTriggerHeader */;
    case Protocol.Audits.AttributionReportingIssueType.InvalidEligibleHeader:
      return "AttributionReportingIssue::InvalidEligibleHeader" /* InvalidEligibleHeader */;
    case Protocol.Audits.AttributionReportingIssueType.TooManyConcurrentRequests:
      return "AttributionReportingIssue::TooManyConcurrentRequests" /* TooManyConcurrentRequests */;
    case Protocol.Audits.AttributionReportingIssueType.SourceAndTriggerHeaders:
      return "AttributionReportingIssue::SourceAndTriggerHeaders" /* SourceAndTriggerHeaders */;
    case Protocol.Audits.AttributionReportingIssueType.SourceIgnored:
      return "AttributionReportingIssue::SourceIgnored" /* SourceIgnored */;
    case Protocol.Audits.AttributionReportingIssueType.TriggerIgnored:
      return "AttributionReportingIssue::TriggerIgnored" /* TriggerIgnored */;
    default:
      return "AttributionReportingIssue::Unknown" /* Unknown */;
  }
}
const structuredHeaderLink = {
  link: "https://tools.ietf.org/id/draft-ietf-httpbis-header-structure-15.html#rfc.section.4.2.2",
  linkTitle: "Structured Headers RFC"
};
export class AttributionReportingIssue extends Issue {
  issueDetails;
  constructor(issueDetails, issuesModel) {
    super(getIssueCode(issueDetails), issuesModel);
    this.issueDetails = issueDetails;
  }
  getCategory() {
    return IssueCategory.AttributionReporting;
  }
  getHeaderValidatorLink(name) {
    const url = new URL("https://wicg.github.io/attribution-reporting-api/validate-headers");
    url.searchParams.set("header", name);
    if (this.issueDetails.invalidParameter) {
      url.searchParams.set("json", this.issueDetails.invalidParameter);
    }
    return {
      link: url.toString(),
      linkTitle: "Header Validator"
    };
  }
  getDescription() {
    switch (this.code()) {
      case "AttributionReportingIssue::PermissionPolicyDisabled" /* PermissionPolicyDisabled */:
        return {
          file: "arPermissionPolicyDisabled.md",
          links: []
        };
      case "AttributionReportingIssue::PermissionPolicyNotDelegated" /* PermissionPolicyNotDelegated */:
        return {
          file: "arPermissionPolicyNotDelegated.md",
          links: []
        };
      case "AttributionReportingIssue::UntrustworthyReportingOrigin" /* UntrustworthyReportingOrigin */:
        return {
          file: "arUntrustworthyReportingOrigin.md",
          links: []
        };
      case "AttributionReportingIssue::InsecureContext" /* InsecureContext */:
        return {
          file: "arInsecureContext.md",
          links: []
        };
      case "AttributionReportingIssue::InvalidRegisterSourceHeader" /* InvalidRegisterSourceHeader */:
        return {
          file: "arInvalidRegisterSourceHeader.md",
          links: [this.getHeaderValidatorLink("source")]
        };
      case "AttributionReportingIssue::InvalidRegisterTriggerHeader" /* InvalidRegisterTriggerHeader */:
        return {
          file: "arInvalidRegisterTriggerHeader.md",
          links: [this.getHeaderValidatorLink("trigger")]
        };
      case "AttributionReportingIssue::InvalidEligibleHeader" /* InvalidEligibleHeader */:
        return {
          file: "arInvalidEligibleHeader.md",
          links: [
            this.getHeaderValidatorLink("eligible"),
            structuredHeaderLink
          ]
        };
      case "AttributionReportingIssue::TooManyConcurrentRequests" /* TooManyConcurrentRequests */:
        return {
          file: "arTooManyConcurrentRequests.md",
          links: []
        };
      case "AttributionReportingIssue::SourceAndTriggerHeaders" /* SourceAndTriggerHeaders */:
        return {
          file: "arSourceAndTriggerHeaders.md",
          links: []
        };
      case "AttributionReportingIssue::SourceIgnored" /* SourceIgnored */:
        return {
          file: "arSourceIgnored.md",
          links: [structuredHeaderLink]
        };
      case "AttributionReportingIssue::TriggerIgnored" /* TriggerIgnored */:
        return {
          file: "arTriggerIgnored.md",
          links: [structuredHeaderLink]
        };
      case "AttributionReportingIssue::Unknown" /* Unknown */:
        return null;
    }
  }
  primaryKey() {
    return JSON.stringify(this.issueDetails);
  }
  getKind() {
    switch (this.code()) {
      case "AttributionReportingIssue::PermissionPolicyNotDelegated" /* PermissionPolicyNotDelegated */:
        return IssueKind.BreakingChange;
      case "AttributionReportingIssue::PermissionPolicyDisabled" /* PermissionPolicyDisabled */:
      case "AttributionReportingIssue::UntrustworthyReportingOrigin" /* UntrustworthyReportingOrigin */:
      case "AttributionReportingIssue::InsecureContext" /* InsecureContext */:
      case "AttributionReportingIssue::InvalidRegisterSourceHeader" /* InvalidRegisterSourceHeader */:
      case "AttributionReportingIssue::InvalidRegisterTriggerHeader" /* InvalidRegisterTriggerHeader */:
      case "AttributionReportingIssue::InvalidEligibleHeader" /* InvalidEligibleHeader */:
      case "AttributionReportingIssue::TooManyConcurrentRequests" /* TooManyConcurrentRequests */:
      case "AttributionReportingIssue::SourceAndTriggerHeaders" /* SourceAndTriggerHeaders */:
      case "AttributionReportingIssue::SourceIgnored" /* SourceIgnored */:
      case "AttributionReportingIssue::TriggerIgnored" /* TriggerIgnored */:
      case "AttributionReportingIssue::Unknown" /* Unknown */:
        return IssueKind.PageError;
    }
  }
  static fromInspectorIssue(issuesModel, inspectorIssue) {
    const { attributionReportingIssueDetails } = inspectorIssue.details;
    if (!attributionReportingIssueDetails) {
      console.warn("Attribution Reporting issue without details received.");
      return [];
    }
    return [new AttributionReportingIssue(attributionReportingIssueDetails, issuesModel)];
  }
}
//# sourceMappingURL=AttributionReportingIssue.js.map
