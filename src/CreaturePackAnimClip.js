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
    const lookupTime = Math.round(timeIn);
    const lowTime = this.timeSamplesMap[lookupTime].beginTime;
    const highTime = this.timeSamplesMap[lookupTime].endTime;

    if ((highTime - lowTime) <= 0.0001) {
      return [lowTime, highTime, 0];
    }

    const curFraction = (timeIn - lowTime) / (highTime - lowTime);

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
    const newTimeSample = new CreatureTimeSample(timeIn, timeIn, dataIdxIn);

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

    let oldTime = this.startTime;
    const arrayOfNumbers = Object.keys(this.timeSamplesMap).map(Number);
    const sortedKeys = arrayOfNumbers.sort(packCmpNumber);

    for (let k = 0; k < sortedKeys.length; k++) {
      const cmpTime = sortedKeys[k];

      if (cmpTime !== oldTime) {
        for (let fillTime = (oldTime + 1); fillTime < cmpTime; fillTime++) {
          const newTimeSample = new CreatureTimeSample(oldTime, cmpTime, -1);

          this.timeSamplesMap[fillTime] = newTimeSample;
        }

        oldTime = cmpTime;
      }
    }
  }
}

export default CreaturePackAnimClip;
