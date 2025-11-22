/**
 * Centralized configuration for graph rendering and layout
 * Following DRY principle - single source of truth for all graph constants
 */
export const GRAPH_CONFIG = {
  /**
   * Node dimensions and sizing
   */
  node: {
    width: 350,
    baseHeight: 200,
    columnHeight: 28, // Height per column row
  },

  /**
   * Dagre layout configuration
   */
  layout: {
    // Spacing between nodes at the same rank
    nodesep: {
      withEdges: 250,
      withoutEdges: 150,
    },
    // Spacing between ranks
    ranksep: {
      withEdges: 350,
      withoutEdges: 250,
    },
    // Edge separation
    edgesep: 150,
    // Graph margins
    marginx: 220,
    marginy: 220,
  },

  /**
   * Visual styling colors
   */
  colors: {
    selected: '#7ed321',
    aiIssue: '#ff6b6b',
    schemaIssue: '#f7b731',
    default: '#3a3a3a',
    edge: {
      normal: '#7ed321',
      missingIndex: '#ff6b6b',
    },
  },

  /**
   * Performance thresholds
   */
  performance: {
    // Threshold for considering dataset "large"
    largeDatasetThreshold: 50,
    // Threshold for enabling virtualization
    enableVirtualization: 100,
    // Cache size limits
    maxCacheSize: 100,
  },

  /**
   * Animation and interaction settings
   */
  animation: {
    fitViewDuration: 400,
    layoutTransitionDelay: 50,
    fitViewPadding: 0.2,
    selectionPadding: 0.5,
    maxZoom: 1,
  },
} as const;

/**
 * Type-safe access to config values
 */
export type GraphConfig = typeof GRAPH_CONFIG;
