/* eslint-disable no-redeclare */
/* eslint-disable no-lone-blocks */

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

    for (var i = 0; i < this.renderColors.length; i++) {
      this.renderColors[i] = 1.0;
    }

    for (var j = 0; j < this.renderUvs.length; j++) {
      this.renderUvs[j] = this.data.uvs[j];
    }
  }

  createRuntimeMap() {
    this.runTimeMap = {};
    var firstSet = false;

    for (var animName in this.data.animClipMap) {
      if (firstSet === false) {
        firstSet = true;
        this.activeAnimationName = animName;
        this.prevAnimationName = animName;
      }

      var animClip = this.data.animClipMap[animName];
      this.runTimeMap[animName] = animClip.startTime;
    }
  }

  // Sets an active animation without blending
  setActiveAnimation(nameIn) {
    if (this.runTimeMap.hasOwnProperty(nameIn)) {
      this.activeAnimationName = nameIn;
      this.prevAnimationName = nameIn;
      this.runTimeMap[this.activeAnimationName] = this.data.animClipMap[this.activeAnimationName].startTime;
    }
  }

  // Smoothly blends to a target animation
  blendToAnimation(nameIn, blendDelta) {
    this.prevAnimationName = this.activeAnimationName;
    this.activeAnimationName = nameIn;
    this.animBlendFactor = 0;
    this.animBlendDelta = blendDelta;
  }

  setRunTime(timeIn) {
    this.runTimeMap[this.activeAnimationName] = this.data.animClipMap[this.activeAnimationName].correctTime(timeIn, this.isLooping);
  }

  getRunTime() {
    return this.runTimeMap[this.activeAnimationName];
  }

  // Steps the animation by a delta time
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
    var firstSampleIdx = 0;
    var secondSampleIdx = 1;
    var sampleFraction = 2;

    {
      // Points blending
      if (this.activeAnimationName === this.prevAnimationName) {
        var curClip = this.data.animClipMap[this.activeAnimationName];
        // no blending
        var curClipInfo = curClip.sampleTime(this.getRunTime());
        var lowData = curClip.timeSamplesMap[curClipInfo[firstSampleIdx]];
        var highData = curClip.timeSamplesMap[curClipInfo[secondSampleIdx]];

        var animLowPoints = this.data.fileData[lowData.getAnimPointsOffset()];
        var animHighPoints = this.data.fileData[highData.getAnimPointsOffset()];

        for (var i = 0; i < this.renderPoints.length; i++) {
          var lowVal = animLowPoints[i];
          var highVal = animHighPoints[i];
          this.renderPoints[i] = this.interpScalar(lowVal, highVal, curClipInfo[sampleFraction]);
        }
      } else {
        // blending

        // Active Clip
        var activeClip = this.data.animClipMap[this.activeAnimationName];

        var activeClipInfo = activeClip.sampleTime(this.getRunTime());
        var activeLowData = activeClip.timeSamplesMap[activeClipInfo[firstSampleIdx]];
        var activeHighData = activeClip.timeSamplesMap[activeClipInfo[secondSampleIdx]];

        var activeAnimLowPoints = this.data.fileData[activeLowData.getAnimPointsOffset()];
        var activeAnimHighPoints = this.data.fileData[activeHighData.getAnimPointsOffset()];

        // Previous Clip
        var prevClip = this.data.animClipMap[this.prevAnimationName];

        var prevClipInfo = prevClip.sampleTime(this.getRunTime());
        var prevLowData = prevClip.timeSamplesMap[prevClipInfo[firstSampleIdx]];
        var prevHighData = prevClip.timeSamplesMap[prevClipInfo[secondSampleIdx]];

        var prevAnimLowPoints = this.data.fileData[prevLowData.getAnimPointsOffset()];
        var prevAnimHighPoints = this.data.fileData[prevHighData.getAnimPointsOffset()];

        for (var j = 0; j < this.renderPoints.length; j++) {
          var activeLowVal = activeAnimLowPoints[j];
          var activeHighVal = activeAnimHighPoints[j];
          var activeVal = this.interpScalar(activeLowVal, activeHighVal, activeClipInfo[sampleFraction]);

          var prevLowVal = prevAnimLowPoints[j];
          var prevHighVal = prevAnimHighPoints[j];
          var prevVal = this.interpScalar(prevLowVal, prevHighVal, prevClipInfo[sampleFraction]);

          this.renderPoints[j] = this.interpScalar(prevVal, activeVal, this.animBlendFactor);
        }
      }

      // Colors
      {
        var curClip = this.data.animClipMap[this.activeAnimationName];
        // no blending
        var curClipInfo = curClip.sampleTime(this.getRunTime());
        var lowData = curClip.timeSamplesMap[curClipInfo[firstSampleIdx]];
        var highData = curClip.timeSamplesMap[curClipInfo[secondSampleIdx]];

        var animLowColors = this.data.fileData[lowData.getAnimColorsOffset()];
        var animHighColors = this.data.fileData[highData.getAnimColorsOffset()];

        if ((animLowColors.length === this.renderColors.length) &&
          (animHighColors.length === this.renderColors.length)) {
          for (var k = 0; k < this.renderColors.length; k++) {
            var lowVal = animLowColors[k];
            var highVal = animHighColors[k];

            this.renderColors[k] = this.interpScalar(lowVal, highVal, curClipInfo[sampleFraction]) / 255.0;
          }
        }
      }

      // UVs
      {
        var curClip = this.data.animClipMap[this.activeAnimationName];
        var curClipInfo = curClip.sampleTime(this.getRunTime());
        var lowData = curClip.timeSamplesMap[curClipInfo[firstSampleIdx]];
        var animUvs = this.data.fileData[lowData.getAnimUvsOffset()];

        if (animUvs.length === this.renderUvs.length) {
          for (var l = 0; l < this.renderUvs.length; l++) {
            this.renderUvs[l] = animUvs[l];
          }
        }
      }
    }
  }
}

export default CreatureHaxeBaseRenderer;
