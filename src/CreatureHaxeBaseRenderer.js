/* eslint-disable no-redeclare */
/* eslint-disable no-lone-blocks */

/**
 * Base Renderer class that target renderers inherit from
 *
 * @class
 * @memberof Tiny.creature
 */
class CreatureHaxeBaseRenderer {
  constructor(dataIn) {
    this.data = dataIn;
    this.createRuntimeMap();

    this.isPlaying = true;
    this.isLooping = true;
    this.animBlendFactor = 0;
    this.animBlendDelta = 0;

    // create data buffers
    this.renderPoints = new Array(this.data.points.length);
    this.renderUvs = new Array(this.data.uvs.length);
    this.renderColors = new Array(this.data.points.length / 2 * 4);

    for (let i = 0; i < this.renderColors.length; i++) {
      this.renderColors[i] = 1.0;
    }

    for (let j = 0; j < this.renderUvs.length; j++) {
      this.renderUvs[j] = this.data.uvs[j];
    }
  }

  createRuntimeMap() {
    this.runTimeMap = {};

    let firstSet = false;

    for (let animName in this.data.animClipMap) {
      if (firstSet === false) {
        firstSet = true;
        this.activeAnimationName = animName;
        this.prevAnimationName = animName;
      }

      const animClip = this.data.animClipMap[animName];

      this.runTimeMap[animName] = animClip.startTime;
    }
  }

  /**
   * Sets an active animation without blending
   *
   * @param {string} nameIn
   */
  setActiveAnimation(nameIn) {
    if (this.runTimeMap.hasOwnProperty(nameIn)) {
      this.activeAnimationName = nameIn;
      this.prevAnimationName = nameIn;
      this.runTimeMap[this.activeAnimationName] = this.data.animClipMap[this.activeAnimationName].startTime;
    }
  }

  /**
   * Smoothly blends to a target animation
   *
   * @param {string} nameIn
   * @param {number} blendDelta
   */
  blendToAnimation(nameIn, blendDelta) {
    this.prevAnimationName = this.activeAnimationName;
    this.activeAnimationName = nameIn;
    this.animBlendFactor = 0;
    this.animBlendDelta = blendDelta;
  }

  /**
   *
   * @param {number} timeIn
   */
  setRunTime(timeIn) {
    this.runTimeMap[this.activeAnimationName] = this.data.animClipMap[this.activeAnimationName].correctTime(timeIn, this.isLooping);
  }

  /**
   * @returns {object}
   */
  getRunTime() {
    return this.runTimeMap[this.activeAnimationName];
  }

  /**
   * Steps the animation by a delta time
   *
   * @param {number} deltaTime
   */
  stepTime(deltaTime) {
    this.setRunTime(this.getRunTime() + deltaTime);

    // update blending
    this.animBlendFactor += this.animBlendDelta;
    if (this.animBlendFactor > 1) {
      this.animBlendFactor = 1;
    }
  }

  interpScalar(val1, val2, fraction) {
    return ((1.0 - fraction) * val1) + (fraction * val2);
  }

  // Call this before a render to update the render data
  syncRenderData() {
    let firstSampleIdx = 0;
    let secondSampleIdx = 1;
    let sampleFraction = 2;

    {
      // Points blending
      if (this.activeAnimationName === this.prevAnimationName) {
        const curClip = this.data.animClipMap[this.activeAnimationName];
        // no blending
        const curClipInfo = curClip.sampleTime(this.getRunTime());
        const lowData = curClip.timeSamplesMap[curClipInfo[firstSampleIdx]];
        const highData = curClip.timeSamplesMap[curClipInfo[secondSampleIdx]];

        const animLowPoints = this.data.fileData[lowData.getAnimPointsOffset()];
        const animHighPoints = this.data.fileData[highData.getAnimPointsOffset()];

        for (let i = 0; i < this.renderPoints.length; i++) {
          const lowVal = animLowPoints[i];
          const highVal = animHighPoints[i];

          this.renderPoints[i] = this.interpScalar(lowVal, highVal, curClipInfo[sampleFraction]);
        }
      } else {
        // blending

        // Active Clip
        const activeClip = this.data.animClipMap[this.activeAnimationName];

        const activeClipInfo = activeClip.sampleTime(this.getRunTime());
        const activeLowData = activeClip.timeSamplesMap[activeClipInfo[firstSampleIdx]];
        const activeHighData = activeClip.timeSamplesMap[activeClipInfo[secondSampleIdx]];

        const activeAnimLowPoints = this.data.fileData[activeLowData.getAnimPointsOffset()];
        const activeAnimHighPoints = this.data.fileData[activeHighData.getAnimPointsOffset()];

        // Previous Clip
        const prevClip = this.data.animClipMap[this.prevAnimationName];

        const prevClipInfo = prevClip.sampleTime(this.getRunTime());
        const prevLowData = prevClip.timeSamplesMap[prevClipInfo[firstSampleIdx]];
        const prevHighData = prevClip.timeSamplesMap[prevClipInfo[secondSampleIdx]];

        const prevAnimLowPoints = this.data.fileData[prevLowData.getAnimPointsOffset()];
        const prevAnimHighPoints = this.data.fileData[prevHighData.getAnimPointsOffset()];

        for (let j = 0; j < this.renderPoints.length; j++) {
          const activeLowVal = activeAnimLowPoints[j];
          const activeHighVal = activeAnimHighPoints[j];
          const activeVal = this.interpScalar(activeLowVal, activeHighVal, activeClipInfo[sampleFraction]);

          const prevLowVal = prevAnimLowPoints[j];
          const prevHighVal = prevAnimHighPoints[j];
          const prevVal = this.interpScalar(prevLowVal, prevHighVal, prevClipInfo[sampleFraction]);

          this.renderPoints[j] = this.interpScalar(prevVal, activeVal, this.animBlendFactor);
        }
      }

      // Colors
      {
        const curClip = this.data.animClipMap[this.activeAnimationName];
        // no blending
        const curClipInfo = curClip.sampleTime(this.getRunTime());
        const lowData = curClip.timeSamplesMap[curClipInfo[firstSampleIdx]];
        const highData = curClip.timeSamplesMap[curClipInfo[secondSampleIdx]];

        const animLowColors = this.data.fileData[lowData.getAnimColorsOffset()];
        const animHighColors = this.data.fileData[highData.getAnimColorsOffset()];

        if ((animLowColors.length === this.renderColors.length) &&
          (animHighColors.length === this.renderColors.length)) {
          for (let k = 0; k < this.renderColors.length; k++) {
            const lowVal = animLowColors[k];
            const highVal = animHighColors[k];

            this.renderColors[k] = this.interpScalar(lowVal, highVal, curClipInfo[sampleFraction]) / 255.0;
          }
        }
      }

      // UVs
      {
        const curClip = this.data.animClipMap[this.activeAnimationName];
        const curClipInfo = curClip.sampleTime(this.getRunTime());
        const lowData = curClip.timeSamplesMap[curClipInfo[firstSampleIdx]];
        const animUvs = this.data.fileData[lowData.getAnimUvsOffset()];

        if (animUvs.length === this.renderUvs.length) {
          for (let l = 0; l < this.renderUvs.length; l++) {
            this.renderUvs[l] = animUvs[l];
          }
        }
      }
    }
  }
}

export default CreatureHaxeBaseRenderer;
