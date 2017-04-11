function interp(x, y0, y1) {
    return y0 + x*(y1-y0);
}

function getInterpWavePoint(wave, x) {
    x = x%1;
    if(x == 0) { // will this ever happen?
        return wave[x];
    } else {
        let ind = Math.floor(x*wave.length);
        let y0 = wave[ind];
        let y1 = ind == wave.length-1 ? 0 : wave[ind+1];
        return interp(x, y0, y1);
    }
}

export default class {
    constructor(fs, structure, freq, attack, release) { // attack and release from 0 to 1
        this.fs = fs;
        this.structure = structure;
        this.freq = freq;
        this.attack = attack;
        this.release = release;

        this.del = fs/freq;
        this.curLoc = 0;
        this.curDel = 0;
        let maxAtkRelTime = 1; // seconds
        this.attackTime = this.attack*maxAtkRelTime*this.fs;
        this.releaseTime = this.release*maxAtkRelTime*this.fs;
        this.waveLength = this.attackTime + this.releaseTime;
    }
    getBuffer(howMuch) {
        let res = [];
        if(this.curLoc >= this.waveLength) return res;

        let i = 0;
        if(this.curLoc < this.attackTime) {
            let diff = this.attackTime-this.curLoc;
            for(; i < Math.min(howMuch, diff); i++) {
                res[i] = (this.curLoc/this.attackTime)*getInterpWavePoint(this.structure, this.curLoc/this.del);
                this.curLoc++;
            }
        }
        if(this.curLoc >= this.attackTime) {
            let diff = (this.attackTime+this.releaseTime)-this.curLoc;
            for(; i < Math.min(howMuch, diff); i++) {
                res[i] = (1-(this.curLoc-this.attackTime)/this.releaseTime)*getInterpWavePoint(this.structure, this.curLoc/this.del);
                this.curLoc++;
            }
        }
        return res;
    }
    howMuchLeft() {
        return this.waveLength.length-this.curLoc;
    }
}

