import MIDI from 'js/midi.js'

// vars
let wave_size;
let width;
let height;

// consts
let wave;
let delta;
let isMouseDown = false;
let last_mousex = -1;
let last_mousey = -1;
let actx = new (window.AudioContext || window.webkitAudioContext)();
let process_node = actx.createScriptProcessor(256, 0, 1);
let cur_phase = 0;
let cur_freq = 440;
let cur_vol = 1;
let cur_notes = [];
let release = .3;
let midi = new MIDI(true, onMIDIDevChange);
let viewmodel = {
    midiinputs: ko.observableArray(),
    selectedInput: ko.observable()
};

process_node.onaudioprocess = function(e) {
    let outputBuffer = e.outputBuffer.getChannelData(0);
    let len = outputBuffer.length;
    let fs = 44100;

    let del = fs/cur_freq;
    if(cur_vol == 0) {
        for(let i = 0; i < len; i++) outputBuffer[i] = 0;
    } else {
        for(let i = 0; i < len; i++) {
            outputBuffer[i] = getInterpWavePoint(i / del + cur_phase)*cur_vol;
            if(cur_notes.length == 0) cur_vol = Math.max(0, cur_vol-(1-release)/fs);
        }
    }

    cur_phase += (len-Math.floor(len/del)*del)/del;
};

function resetWave(type) {
    if(!type || type=='sin') {
        for (let i = 0; i < wave_size; i++)
            wave[i] = Math.sin(2 * Math.PI * i / wave_size);
    } else if(type=='tri'){
        let dx = 4/wave_size;
        let pos = 1;
        let curx = 0;
        for(let i = 0; i < wave_size; i++) {
            wave[i] = curx;
            curx += pos*dx;
            if(Math.abs(curx) > 1) {
                curx = 2*pos-curx;
                pos *= -1;
            }
        }
    } else if(type=='saw') {
        let dx = 2/wave_size;
        let curx = 0;
        for(let i = 0; i < wave_size; i++) {
            wave[i] = curx;
            curx += dx;
            if(curx > 1) curx -= 2;
        }
    } else if(type=='square') {
        for(let i = 0; i < wave_size; i++) {
            if(i > wave_size/2) wave[i] = 1;
            else wave[i] = -1;
        }
    }

    drawWave();
}

function drawWave() {
    let canv = document.getElementById('wave');
    if (canv.getContext) {
        let ctx = canv.getContext('2d');
        ctx.clearRect(0,0,width, height);

        for(let i = 0; i < wave_size; i++) {
            ctx.fillRect(i/wave_size*width, height/2, 1/wave_size*width, height/2*wave[i]);
        }

    }
}

function setWavePoint(x, y) {
    let tolerance = .02;
    let loc = Math.floor(Math.floor(x/delta)*delta*(wave_size/width));
    let res = y/height*2-1;
    if(loc > (1-tolerance)*wave_size) {
        res *= (1-loc/wave_size)/tolerance;
    } else if(loc < tolerance*wave_size) {
        res *= loc/wave_size/tolerance;
    }
    wave[loc] = res;
}

function interp(x, y0, y1) {
    return y0 + x*(y1-y0);
}

function getInterpWavePoint(x) {
    x = x%1;
    if(x == 0 || x == 1) { // will this ever happen?
        return wave[x];
    } else {
        let y0 = wave[Math.floor(x*wave_size)];
        let y1 = Math.ceil(x*wave_size) == wave_size ? 0 : wave[Math.ceil(x*wave_size)];
        return interp(x, y0, y1);
    }
}

// event handlers
function onMIDIDevChange() {
    let inputs = midi.getInputs();
    let newInputs = [];
    inputs.forEach(function(item) {
        newInputs.push({ name: item.name, value: item });
    });
    viewmodel.midiinputs(newInputs);
}

function onMIDIMessage(event) {
    let data = event.data;
    let c = data[0] & 0xF0;
    if(c == 0x80 ) {
        console.log('note off: ' + data[1]);
        cur_notes.splice(cur_notes.indexOf(data[1]), 1);
        if(cur_notes.length != 0) cur_freq = Math.pow(2, (cur_notes[cur_notes.length-1]-69)/12)*440;
    }
    if(c == 0x90) {
        console.log('note on: ' + data[1] + ' vel ' + data[2]);
        cur_freq = Math.pow(2, (data[1]-69)/12)*440;
        cur_vol = data[2]/127;
        cur_notes.push(data[1]);
    }
}

document.getElementById('wave').onmousedown = function(e) {
    e.preventDefault();
    isMouseDown = true;
    last_mousex = -1;
    last_mousey = -1;
};
document.getElementById('wave').addEventListener('touchstart', function(e){
    e.preventDefault();
    isMouseDown = true;
    last_mousex = -1;
    last_mousey = -1;
});
document.getElementById('wave').onmousemove = function(e) {
    e.preventDefault();
    if(!isMouseDown) return;
    let x = e.offsetX;
    let y = e.offsetY;
    if(last_mousex != -1 && last_mousey != -1) {
        let del = 1 / wave_size * width;
        let amt = Math.floor(Math.abs(last_mousex - x) / del);
        let sign = (x - last_mousex) < 0 ? -1 : 1;
        for (let i = 0; i < amt; i++) {
            setWavePoint(x - sign * del * i, interp(del * i / Math.abs((last_mousex - x)), y, last_mousey));
        }
    }
    setWavePoint(x, y);
    drawWave();
    last_mousex = x;
    last_mousey = y;
};
document.getElementById('wave').addEventListener('touchmove', function(e) {
    e.preventDefault();
    if(!isMouseDown) return;
    let x = e.changedTouches[0].pageX - e.target.clientLeft;
    let y = e.changedTouches[0].pageY- e.target.clientTop;
    if(last_mousex != -1 && last_mousey != -1) {
        let del = 1 / wave_size * width;
        let amt = Math.floor(Math.abs(last_mousex - x) / del);
        let sign = (x - last_mousex) < 0 ? -1 : 1;
        for (let i = -1; i < amt; i++) {
            setWavePoint(x - sign * del * i, interp(del * i / Math.abs((last_mousex - x)), y, last_mousey));
        }
    }
    setWavePoint(x, y);
    drawWave();
    last_mousex = x;
    last_mousey = y;
});
document.getElementById('wave').onmouseup = function(e) {
    e.preventDefault();
    isMouseDown = false;
};
document.getElementById('wave').addEventListener('touchend', function(e) {
    e.preventDefault();
    isMouseDown = false;
});
document.getElementById('reset').onclick = document.getElementById('sin').onclick = function(e) { resetWave(); };
document.getElementById('tri').onclick = function(e) { resetWave('tri'); };
document.getElementById('saw').onclick = function(e) { resetWave('saw'); };
document.getElementById('square').onclick = function(e) { resetWave('square'); };

// initialization
function init() {
    width = document.body.clientWidth;
    height = 400;

    let canv = document.getElementById('wave');
    canv.width = width;
    canv.height = height;
    wave_size = width;

    wave = new Float32Array(Array.apply(null, Array(wave_size)).map(function (_, i) {return i;}));
    delta = 1/wave_size*width;

    resetWave();
    drawWave();
    ko.applyBindings(viewmodel);

    viewmodel.selectedInput.subscribe(function(oldVal) {
        if(oldVal) oldVal.onmidimessage = null;
    }, null, 'beforeChange');
    viewmodel.selectedInput.subscribe(function(newVal) {
        console.log('selected MIDI device: '+newVal.name);
        newVal.onmidimessage = onMIDIMessage;
    }, null, 'change');

    process_node.connect(actx.destination);
}
init();
