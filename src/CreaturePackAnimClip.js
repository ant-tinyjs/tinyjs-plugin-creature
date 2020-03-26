import CreatureTimeSample from './CreatureTimeSample';

class CreaturePackAnimClip {
  constructor(dataIdxIn) {
    this.dataIdx = dataIdxIn;
    this.startTime = 0;
    this.endTime = 0;
    this.firstSet = false;
    this.timeSamplesMap = {};
  }

  sampleTime(timeIn) {
    var lookupTime = Math.round(timeIn);
    var lowTime = this.timeSamplesMap[lookupTime].beginTime;
    var highTime = this.timeSamplesMap[lookupTime].endTime;

    if ((highTime - lowTime) <= 0.0001) {
      return [lowTime, highTime, 0];
    }

    var curFraction = (timeIn - lowTime) / (highTime - lowTime);

    return [lowTime, highTime, curFraction];
  }

  correctTime(timeIn, withLoop) {
    if (this.withLoop === false) {
      if (timeIn < this.startTime) {
        return this.startTime;
      } else if (timeIn > this.endTime) {
        return this.endTime;
      }
    } else {
      if (timeIn < this.startTime) {
        return this.endTime;
      } else if (timeIn > this.endTime) {
        return this.startTime;
      }
    }

    return timeIn;
  };

  addTimeSample(timeIn, dataIdxIn) {
    var newTimeSample = new CreatureTimeSample(timeIn, timeIn, dataIdxIn);

    this.timeSamplesMap[timeIn] = newTimeSample;

    if (this.firstSet === false) {
      this.firstSet = true;
      this.startTime = timeIn;
      this.endTime = timeIn;
    } else {
      if (this.startTime > timeIn) {
        this.startTime = timeIn;
      }

      if (this.endTime < timeIn) {
        this.endTime = timeIn;
      }
    }
  }

  finalTimeSamples() {
    function packCmpNumber(a, b) {
      return a - b;
    }

    var oldTime = this.startTime;
    var arrayOfNumbers = Object.keys(this.timeSamplesMap).map(Number);
    var sortedKeys = arrayOfNumbers.sort(packCmpNumber);

    for (var k = 0; k < sortedKeys.length; k++) {
      var cmpTime = sortedKeys[k];

      if (cmpTime !== oldTime) {
        for (var fillTime = (oldTime + 1); fillTime < cmpTime; fillTime++) {
          var newTimeSample = new CreatureTimeSample(oldTime, cmpTime, -1);

          this.timeSamplesMap[fillTime] = newTimeSample;
        }

        oldTime = cmpTime;
      }
    }
  }
}

export default CreaturePackAnimClip;
