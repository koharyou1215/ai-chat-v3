// SuperClaude Integration Service
// Handles integration between SuperClaude workflows and prompt generation

import { superClaudeManager } from "./superclaude-workflows";

export class SuperClaudeIntegrationService {
  /**
   * Enhance user input with SuperClaude workflow context
   * This method should be called before sending messages to ensure
   * workflow templates, commands, and alpha contexts are included
   */
  public static enhanceInputWithSuperClaude(userInput: string): string {
    // Get the current SuperClaude configuration
    const config = superClaudeManager.getConfig();

    // If no workflow or enhancements are configured, return original input
    if (
      !config.selectedWorkflow &&
      config.additionalCommands.length === 0 &&
      config.alphaContexts.length === 0 &&
      config.customFlags.length === 0
    ) {
      return userInput;
    }

    // Generate the SuperClaude prompt
    const superClaudePrompt = superClaudeManager.generatePrompt();

    // If there's a SuperClaude prompt, append it to the user input
    if (superClaudePrompt) {
      // Add the SuperClaude context as a system instruction at the beginning
      return `${superClaudePrompt}\n\n---\n\n${userInput}`;
    }

    return userInput;
  }

  /**
   * Get SuperClaude system instructions to be added to the system prompt
   */
  public static getSuperClaudeSystemInstructions(): string | null {
    const config = superClaudeManager.getConfig();

    // If no workflow is selected, return null
    if (!config.selectedWorkflow) {
      return null;
    }

    const workflow = superClaudeManager.getWorkflow(config.selectedWorkflow);
    if (!workflow) {
      return null;
    }

    // Build system instructions based on the workflow
    const instructions: string[] = [];

    // Add workflow description
    instructions.push(`## Active Workflow: ${workflow.nameJa}`);
    instructions.push(workflow.descriptionJa);

    // Add flags if present
    if (workflow.flags && workflow.flags.length > 0) {
      instructions.push(`\n### Execution Flags:`);
      instructions.push(`${workflow.flags.join(" ")}`);
    }

    // Add commands if present
    if (workflow.commands && workflow.commands.length > 0) {
      instructions.push(`\n### Available Commands:`);
      workflow.commands.forEach((cmd) => {
        instructions.push(`- ${cmd}`);
      });
    }

    // Add additional commands
    if (config.additionalCommands.length > 0) {
      instructions.push(`\n### Additional Commands:`);
      config.additionalCommands.forEach((cmd) => {
        instructions.push(`- ${cmd}`);
      });
    }

    // Add alpha contexts
    if (config.alphaContexts.length > 0) {
      instructions.push(`\n### Alpha Features Enabled:`);
      config.alphaContexts.forEach((contextId) => {
        instructions.push(`- ${contextId}`);
      });
    }

    // Add custom flags
    if (config.customFlags.length > 0) {
      instructions.push(`\n### Custom Flags:`);
      instructions.push(config.customFlags.join(" "));
    }

    return instructions.join("\n");
  }

  /**
   * Check if SuperClaude is active
   */
  public static isSuperClaudeActive(): boolean {
    const config = superClaudeManager.getConfig();
    return !!(
      config.selectedWorkflow ||
      config.additionalCommands.length > 0 ||
      config.alphaContexts.length > 0 ||
      config.customFlags.length > 0
    );
  }

  /**
   * Clear SuperClaude configuration
   */
  public static clearSuperClaudeConfig(): void {
    superClaudeManager.reset();
    localStorage.removeItem("superClaudeConfig");
  }

  /**
   * Load SuperClaude configuration from localStorage
   */
  public static loadSuperClaudeConfig(): void {
    const savedConfig = localStorage.getItem("superClaudeConfig");
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        superClaudeManager.loadConfig(parsedConfig);
      } catch (error) {
        console.error("Failed to load SuperClaude config:", error);
      }
    }
  }

  /**
   * Get workflow-specific prompt template
   */
  public static getWorkflowPromptTemplate(): string | null {
    const config = superClaudeManager.getConfig();
    if (!config.selectedWorkflow) {
      return null;
    }

    const workflow = superClaudeManager.getWorkflow(config.selectedWorkflow);
    return workflow?.prompt || null;
  }

  /**
   * Apply SuperClaude enhancements to a prompt object
   * This is used for structured prompt building
   */
  public static enhancePromptSections(sections: Record<string, string>): Record<string, string> {
    const enhancedSections = { ...sections };

    // Add SuperClaude system instructions if active
    const superClaudeInstructions = this.getSuperClaudeSystemInstructions();
    if (superClaudeInstructions) {
      // Append to existing system instructions
      if (enhancedSections.system) {
        enhancedSections.system = `${enhancedSections.system}\n\n${superClaudeInstructions}`;
      } else {
        enhancedSections.system = superClaudeInstructions;
      }
    }

    // Add workflow-specific template if available
    const workflowTemplate = this.getWorkflowPromptTemplate();
    if (workflowTemplate) {
      enhancedSections.workflow = workflowTemplate;
    }

    return enhancedSections;
  }
}

// Export singleton for easy access
export const superClaudeIntegration = SuperClaudeIntegrationService;