import * as msgpack from './msgpack';
import CreaturePackAnimClip from './CreaturePackAnimClip';
import GraphNode from './GraphNode';

/**
 * This is the class the loads in Creature Pack Data from disk or net
 *
 * @class
 * @memberof Tiny.creature
 */
class CreaturePackLoader {
  /**
   *
   * @param {Uint8Array} bytesIn
   */
  constructor(bytesIn) {
    this.indices = [];
    this.uvs = [];
    this.points = [];
    this.animClipMap = {};
    this.headerList = [];
    this.animPairsOffsetList = [];

    this.dMinX = 0.0;
    this.dMinY = 0.0;
    this.dMaxX = 0.0;
    this.dMaxY = 0.0;

    this.fileData = msgpack.decode(bytesIn);

    this.headerList = this.fileData[this.getBaseOffset()];
    this.animPairsOffsetList = this.fileData[this.getAnimPairsListOffset()];

    // init basic points and topology structure
    this.indices = new Array(this.getNumIndices());
    this.points = new Array(this.getNumPoints());
    this.uvs = new Array(this.getNumUvs());

    this.updateIndices(this.getBaseIndicesOffset());
    this.updatePoints(this.getBasePointsOffset());
    this.updateUVs(this.getBaseUvsOffset());

    this.fillDeformRanges();
    this.finalAllPointSamples();

    // init Animation Clip Map
    for (let i = 0; i < this.getAnimationNum(); i++) {
      const curOffsetPair = this.getAnimationOffsets(i);
      const animName = this.fileData[curOffsetPair[0]];
      let k = curOffsetPair[0];

      k++;

      const newClip = new CreaturePackAnimClip(k);

      while (k < curOffsetPair[1]) {
        const curTime = this.fileData[k];

        newClip.addTimeSample(curTime, k);
        k += 4;
      }

      newClip.finalTimeSamples();
      this.animClipMap[animName] = newClip;
    }

    this.meshRegionsList = this.findConnectedRegions();
  }

  formUndirectedGraph() {
    const retGraph = {};
    const numTriangles = this.getNumIndices() / 3;

    for (let i = 0; i < numTriangles; i++) {
      const triIndices = new Array(3);

      triIndices[0] = this.indices[i * 3];
      triIndices[1] = this.indices[i * 3 + 1];
      triIndices[2] = this.indices[i * 3 + 2];

      for (let m = 0; m < triIndices.length; m++) {
        const triIndex = triIndices[m];

        if ((triIndex in retGraph) === false) {
          retGraph[triIndex] = new GraphNode(triIndex);
        }

        const curGraphNode = retGraph[triIndex];

        for (let j = 0; j < triIndices.length; j++) {
          const cmpIndex = triIndices[j];

          if (cmpIndex !== triIndex) {
            curGraphNode.neighbours.push(cmpIndex);
          }
        }
      }
    }

    return retGraph;
  }

  regionsDFS(graph, idx) {
    const retData = [];

    if (graph[idx].visited) {
      return retData;
    }

    const gstack = [];

    gstack.push(idx);

    while (gstack.length > 0) {
      const curIdx = gstack.pop();
      const curNode = graph[curIdx];

      if (curNode.visited === false) {
        curNode.visited = true;
        retData.push(curNode.idx);
        // search all connected for curNode
        for (let m = 0; m < curNode.neighbours.length; m++) {
          const neighbourIdx = curNode.neighbours[m];

          gstack.push(neighbourIdx);
        }
      }
    }

    return retData;
  }

  findConnectedRegions() {
    const regionsList = [];
    const graph = this.formUndirectedGraph();

    for (let i = 0; i < this.getNumIndices(); i++) {
      const curIdx = this.indices[i];

      if (graph[curIdx].visited === false) {
        const indicesList = this.regionsDFS(graph, curIdx);

        indicesList.sort(function(a, b) {
          return a - b;
        });

        regionsList.push([
          indicesList[0],
          indicesList[indicesList.length - 1],
        ]);
      }
    }

    return regionsList;
  }

  updateIndices(idx) {
    const curData = this.fileData[idx];

    for (var i = 0; i < curData.length; i++) {
      this.indices[i] = curData[i];
    }
  }

  updatePoints(idx) {
    const curData = this.fileData[idx];

    for (let i = 0; i < curData.length; i++) {
      this.points[i] = curData[i];
    }
  }

  updateUVs(idx) {
    const curData = this.fileData[idx];

    for (let i = 0; i < curData.length; i++) {
      this.uvs[i] = curData[i];
    }
  }

  getAnimationNum() {
    let sum = 0;

    for (let i = 0; i < this.headerList.length; i++) {
      if (this.headerList[i] === 'animation') {
        sum++;
      }
    }

    return sum;
  }

  hasDeformCompress() {
    for (let i = 0; i < this.headerList.length; i++) {
      if (this.headerList[i] === 'deform_comp1') {
        return 'deform_comp1';
      } else if (this.headerList[i] === 'deform_comp2') {
        return 'deform_comp2';
      } else if (this.headerList[i] === 'deform_comp1_1') {
        return 'deform_comp1_1';
      }
    }

    return '';
  }

  fillDeformRanges() {
    if (this.hasDeformCompress() !== '') {
      const curRangesOffset = this.getAnimationOffsets(this.getAnimationNum());
      const curRanges = this.fileData[curRangesOffset[0]];

      this.dMinX = curRanges[0];
      this.dMinY = curRanges[1];
      this.dMaxX = curRanges[2];
      this.dMaxY = curRanges[3];
    }
  };

  finalAllPointSamples() {
    const deformCompressType = this.hasDeformCompress();

    if (deformCompressType === '') {
      return;
    }

    for (let i = 0; i < this.getAnimationNum(); i++) {
      const curOffsetPair = this.getAnimationOffsets(i);
      let k = curOffsetPair[0];

      k++;

      while (k < curOffsetPair[1]) {
        const ptsRawArray = this.fileData[k + 1];
        const ptsRawByteArray = this.fileData[k + 1];
        let rawNum = ptsRawArray.byteLength;
        const ptsDataview = new DataView(ptsRawByteArray);

        if (deformCompressType === 'deform_comp2') {
          rawNum = ptsRawByteArray.byteLength;
        } else if (deformCompressType === 'deform_comp1_1') {
          rawNum = ptsRawByteArray.byteLength / 2;
        }

        const finalPtsArray = new Array(rawNum);

        for (let m = 0; m < rawNum; m++) {
          let bucketVal = 0;
          let numBuckets = 0;

          if (deformCompressType === 'deform_comp1') {
            bucketVal = ptsRawArray[m];
            numBuckets = 65535;
          } else if (deformCompressType === 'deform_comp2') {
            bucketVal = ptsDataview.getUint8(m);
            numBuckets = 255;
          } else if (deformCompressType === 'deform_comp1_1') {
            bucketVal = ptsDataview.getUint16(m * 2, true);
            numBuckets = 65535;
          }

          let setVal = 0.0;

          if (m % 2 === 0) {
            setVal = (bucketVal / numBuckets * (this.dMaxX - this.dMinX)) + this.dMinX;
            setVal += this.points[m];
          } else {
            setVal = (bucketVal / numBuckets * (this.dMaxY - this.dMinY)) + this.dMinY;
            setVal += this.points[m];
          }

          finalPtsArray[m] = setVal;
        }

        this.fileData[k + 1] = finalPtsArray;
        k += 4;
      }
    }
  }

  getAnimationOffsets(idx) {
    return [
      this.animPairsOffsetList[idx * 2],
      this.animPairsOffsetList[idx * 2 + 1],
    ];
  }

  getBaseOffset() {
    return 0;
  }

  getAnimPairsListOffset() {
    return 1;
  }

  getBaseIndicesOffset() {
    return this.getAnimPairsListOffset() + 1;
  }

  getBasePointsOffset() {
    return this.getAnimPairsListOffset() + 2;
  }

  getBaseUvsOffset() {
    return this.getAnimPairsListOffset() + 3;
  }

  getNumIndices() {
    return this.fileData[this.getBaseIndicesOffset()].length;
  }

  getNumPoints() {
    return this.fileData[this.getBasePointsOffset()].length;
  }

  getNumUvs() {
    return this.fileData[this.getBaseUvsOffset()].length;
  }
}

export default CreaturePackLoader;
