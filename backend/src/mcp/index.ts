/**
 * MCP Toolchain - Index
 * 
 * Exports all MCP tools and the tool registry.
 */

// Tool Registry
export * from './tool-registry.js';

// Import tools to auto-register them
import './tools/trade-tool.js';
import './tools/price-tool.js';
import './tools/search-tool.js';
import './tools/math-tool.js';

// Re-export individual tool registrars if needed
export { registerTradeTools } from './tools/trade-tool.js';
export { registerPriceTools } from './tools/price-tool.js';
export { registerSearchTools } from './tools/search-tool.js';
export { registerMathTools } from './tools/math-tool.js';
