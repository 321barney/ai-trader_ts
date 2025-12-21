/**
 * MCP Tool Registry
 * 
 * Model Context Protocol toolchain for AI agent operations.
 * Provides a standardized interface for:
 * - Trade execution (buy/sell)
 * - Price queries
 * - Portfolio management
 * - Market intelligence search
 * - Mathematical calculations
 */

export interface ToolParameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description: string;
    required: boolean;
    default?: any;
    enum?: string[];
}

export interface ToolResult {
    success: boolean;
    data?: any;
    error?: string;
    timestamp: Date;
}

export interface MCPTool {
    name: string;
    description: string;
    category: 'trade' | 'data' | 'analysis' | 'utility';
    parameters: ToolParameter[];
    execute(params: Record<string, any>, context: ToolContext): Promise<ToolResult>;
}

export interface ToolContext {
    userId: string;
    sessionId?: string;  // For replay sessions
    isBacktest: boolean;
    currentDate?: Date;  // For anti-look-ahead in backtesting
}

// Tool registry singleton
class ToolRegistry {
    private tools: Map<string, MCPTool> = new Map();

    /**
     * Register a new tool
     */
    registerTool(tool: MCPTool): void {
        if (this.tools.has(tool.name)) {
            console.warn(`[MCP] Tool ${tool.name} already registered, overwriting...`);
        }
        this.tools.set(tool.name, tool);
        console.log(`[MCP] Registered tool: ${tool.name}`);
    }

    /**
     * Get a tool by name
     */
    getTool(name: string): MCPTool | undefined {
        return this.tools.get(name);
    }

    /**
     * List all available tools
     */
    listTools(): MCPTool[] {
        return Array.from(this.tools.values());
    }

    /**
     * List tools by category
     */
    listToolsByCategory(category: MCPTool['category']): MCPTool[] {
        return this.listTools().filter(t => t.category === category);
    }

    /**
     * Execute a tool by name
     */
    async executeTool(
        name: string,
        params: Record<string, any>,
        context: ToolContext
    ): Promise<ToolResult> {
        const tool = this.tools.get(name);

        if (!tool) {
            return {
                success: false,
                error: `Tool '${name}' not found`,
                timestamp: new Date(),
            };
        }

        // Validate required parameters
        for (const param of tool.parameters) {
            if (param.required && !(param.name in params)) {
                return {
                    success: false,
                    error: `Missing required parameter: ${param.name}`,
                    timestamp: new Date(),
                };
            }
        }

        try {
            console.log(`[MCP] Executing tool: ${name}`, params);
            const result = await tool.execute(params, context);
            console.log(`[MCP] Tool ${name} completed:`, result.success);
            return result;
        } catch (error: any) {
            console.error(`[MCP] Tool ${name} failed:`, error);
            return {
                success: false,
                error: error.message || 'Tool execution failed',
                timestamp: new Date(),
            };
        }
    }

    /**
     * Get tool schema for AI prompt
     */
    getToolsSchema(): object[] {
        return this.listTools().map(tool => ({
            name: tool.name,
            description: tool.description,
            parameters: {
                type: 'object',
                properties: Object.fromEntries(
                    tool.parameters.map(p => [
                        p.name,
                        {
                            type: p.type,
                            description: p.description,
                            ...(p.enum && { enum: p.enum }),
                            ...(p.default !== undefined && { default: p.default }),
                        },
                    ])
                ),
                required: tool.parameters.filter(p => p.required).map(p => p.name),
            },
        }));
    }

    /**
     * Generate tool prompt for AI
     */
    generateToolPrompt(): string {
        const tools = this.listTools();

        let prompt = `You have access to the following tools:\n\n`;

        for (const tool of tools) {
            prompt += `### ${tool.name}\n`;
            prompt += `${tool.description}\n`;
            prompt += `Parameters:\n`;

            for (const param of tool.parameters) {
                const required = param.required ? '(required)' : '(optional)';
                prompt += `  - ${param.name} [${param.type}] ${required}: ${param.description}\n`;
                if (param.enum) {
                    prompt += `    Options: ${param.enum.join(', ')}\n`;
                }
            }
            prompt += '\n';
        }

        prompt += `\nTo use a tool, respond with:\n`;
        prompt += `TOOL: <tool_name>\n`;
        prompt += `PARAMS: <json_params>\n`;

        return prompt;
    }
}

// Export singleton instance
export const toolRegistry = new ToolRegistry();

// ============================================
// Tool Execution Helper
// ============================================

/**
 * Parse tool call from AI response
 */
export function parseToolCall(response: string): {
    toolName: string;
    params: Record<string, any>;
} | null {
    const toolMatch = response.match(/TOOL:\s*(\w+)/i);
    const paramsMatch = response.match(/PARAMS:\s*({[\s\S]*?})/i);

    if (!toolMatch) return null;

    const toolName = toolMatch[1];
    let params: Record<string, any> = {};

    if (paramsMatch) {
        try {
            params = JSON.parse(paramsMatch[1]);
        } catch (e) {
            console.error('[MCP] Failed to parse tool params:', e);
        }
    }

    return { toolName, params };
}

/**
 * Execute tool from AI response
 */
export async function executeFromResponse(
    response: string,
    context: ToolContext
): Promise<ToolResult | null> {
    const toolCall = parseToolCall(response);
    if (!toolCall) return null;

    return toolRegistry.executeTool(toolCall.toolName, toolCall.params, context);
}
