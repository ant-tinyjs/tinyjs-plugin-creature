class CreatureTimeSample {
  constructor(beginTimeIn, endTimeIn, dataIdxIn) {
    this.beginTime = beginTimeIn;
    this.endTime = endTimeIn;
    this.dataIdx = dataIdxIn;
  }

  getAnimPointsOffset() {
    if (this.dataIdx < 0) {
      return -1; // invalid
    }

    return this.dataIdx + 1;
  }

  getAnimUvsOffset() {
    if (this.dataIdx < 0) {
      return -1;
      // invalid
    }

    return this.dataIdx + 2;
  }

  getAnimColorsOffset() {
    if (this.dataIdx < 0) {
      return -1;
      // invalid
    }

    return this.dataIdx + 3;
  }
}

export default CreatureTimeSample;
