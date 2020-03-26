class GraphNode {
  constructor(idxIn = -1) {
    this.init(idxIn);
  }

  init(idxIn) {
    this.idx = idxIn;
    this.visited = false;
    this.neighbours = [];
  }
}

export default GraphNode;
