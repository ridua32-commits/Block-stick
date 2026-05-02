/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type BlockShape = number[][];

export interface BlockTemplate {
  id: string;
  shape: BlockShape;
  color: string;
}

export const GRID_SIZE = 10;

export const BLOCK_STYLES = {
  blue: "bg-[#2563EB]",
  red: "bg-[#EF4444]",
  green: "bg-[#22C55E]",
  yellow: "bg-[#EAB308]",
  purple: "bg-[#A855F7]",
  orange: "bg-[#F97316]",
  cyan: "bg-[#06B6D4]",
};

export const SHAPES: Omit<BlockTemplate, "id">[] = [
  // Dot
  { shape: [[1]], color: "blue" },
  // 1x2
  { shape: [[1, 1]], color: "blue" },
  { shape: [[1], [1]], color: "blue" },
  // 1x3
  { shape: [[1, 1, 1]], color: "red" },
  { shape: [[1], [1], [1]], color: "red" },
  // 1x4
  { shape: [[1, 1, 1, 1]], color: "green" },
  { shape: [[1], [1], [1], [1]], color: "green" },
  // 1x5
  { shape: [[1, 1, 1, 1, 1]], color: "cyan" },
  // 2x2 Square
  { shape: [[1, 1], [1, 1]], color: "yellow" },
  // 3x3 Square
  { shape: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], color: "purple" },
  // L-Shapes
  { shape: [[1, 0], [1, 0], [1, 1]], color: "orange" },
  { shape: [[0, 1], [0, 1], [1, 1]], color: "orange" },
  { shape: [[1, 1], [1, 0], [1, 0]], color: "orange" },
  { shape: [[1, 1], [0, 1], [0, 1]], color: "orange" },
  // Small L
  { shape: [[1, 0], [1, 1]], color: "blue" },
  // T-Shapes
  { shape: [[1, 1, 1], [0, 1, 0]], color: "purple" },
  // Corner
  { shape: [[1, 1], [1, 0]], color: "cyan" },
];
