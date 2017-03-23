export default class {
    constructor(sysex, onstatechange) {
        let self = this;
        if (typeof navigator.requestMIDIAccess === 'function') {
            navigator.requestMIDIAccess({'sysex': sysex}).then(function(access) {
                console.log('got MIDI');
                self.midi = access;
                access.onstatechange = onstatechange;
                onstatechange();
            }, function() {
                console.error('error getting MIDI access');
            });
        } else {
            console.error('no MIDI support in browser');
        }
    }
    isOkay() {
        return this.midi != undefined && this.midi.constructor.name === 'MIDIAccess';
    }
    getInputs() {
        if(!this.isOkay()) return undefined;
        return this.midi.inputs;
    }
}