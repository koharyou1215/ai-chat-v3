// SuperClaude Components and Services Export
// Central export point for all SuperClaude functionality

// Components
export { SuperClaudePanel } from "./SuperClaudePanel";
export { default as MessageInputWithSuperClaude } from "../chat/MessageInputWithSuperClaude";

// Services
export {
  WORKFLOW_TEMPLATES,
  ADDITIONAL_COMMANDS,
  ALPHA_CONTEXTS,
  DEFAULT_SUPERCLAUDE_CONFIG,
  SuperClaudeWorkflowManager,
  superClaudeManager,
  type WorkflowTemplate,
  type SuperClaudeConfig,
} from "../../services/superclaude-workflows";

export {
  SuperClaudeIntegrationService,
  superClaudeIntegration,
} from "../../services/superclaude-integration.service";

// Hooks
export {
  useSuperClaude,
  useSuperClaudeMessageEnhancement,
  default as useSuperClaudeHook,
} from "../../hooks/useSuperClaude";