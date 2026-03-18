import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";
import { NODE_HEIGHT, NODE_WIDTH } from "../data";

export function getLayoutedElements(
  rawNodes: Node[],
  rawEdges: Edge[],
  direction: "LR" | "TB" = "LR"
) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: 90,
    nodesep: 40,
    marginx: 30,
    marginy: 30,
  });

  rawNodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  });

  rawEdges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = rawNodes.map((node) => {
    const position = dagreGraph.node(node.id);

    return {
      ...node,
      position: {
        x: position.x - NODE_WIDTH / 2,
        y: position.y - NODE_HEIGHT / 2,
      },
      sourcePosition: direction === "LR" ? "right" : "bottom",
      targetPosition: direction === "LR" ? "left" : "top",
    };
  });

  return { nodes: layoutedNodes, edges: rawEdges };
}