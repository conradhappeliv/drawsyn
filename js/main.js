import CustomWave from 'js/customwave.js'

// global vars (sorry)
let wave_size;
let width;
let height;
let wave;
let delta;
let isMouseDown = false;
let last_mousex = -1;
let last_mousey = -1;
let actx = new (window.AudioContext || window.webkitAudioContext)();
let process_node = actx.createScriptProcessor(1024, 0, 1);
let compressor = actx.createDynamicsCompressor();
compressor.threshold.value = -40;
compressor.knee.value = 40;
compressor.ratio.value = 20;
compressor.attack.value = 0;
compressor.release.value = 0.25;
let cur_bpm = 120;
let cur_attack = .25;
let cur_release = .25;
let cur_difference = 60;
let cur_octave = 4;
let amt = 12;
let seqGrid;
let curCol = 0;
let playingNotes = [];
let sinceLastNote = 0;

process_node.onaudioprocess = function(e) {
    let outputBuffer = e.outputBuffer.getChannelData(0);
    let len = outputBuffer.length;
    for(let i = 0; i < len; i++) {
        outputBuffer[i] = 0;
    }

    let fs = 44100;
    let sampsPerBeat = fs/(cur_bpm/16); // samps per note
    let lastCol = curCol == 0 ? amt - 1 : curCol - 1;
    if(sinceLastNote > sampsPerBeat) {
        for(let row = 0; row < amt; row++) {
            if(seqGrid[row][curCol]) {
                playingNotes.push(new CustomWave(44100, wave, 440*Math.pow(2, -4+cur_octave) + cur_difference*row, cur_attack, cur_release));
                let node = document.getElementById(row.toString()+'@'+curCol.toString());
                node.classList.add('active');
            }
            if(seqGrid[row][lastCol]) {
                let node = document.getElementById(row.toString()+'@'+lastCol.toString());
                node.classList.remove('active');
            }
        }

        curCol++;
        if(curCol >= amt) curCol = 0;
        sinceLastNote -= sampsPerBeat;
    }

    for(let note in playingNotes) {
        let res = playingNotes[note].getBuffer(len);
        for(let i = 0; i < res.length; i++) {
            outputBuffer[i] += res[i]*.1;
        }
    }

    for(let i = playingNotes.length-1; i >= 0; i--) {
        if(playingNotes[i].howMuchLeft() <= 0) playingNotes.splice(i, 1);

    }

    sinceLastNote += outputBuffer.length;
};

function createSeq() {
    let seq = document.getElementById('seq');
    seq.innerHTML = "";
    seqGrid = new Array(amt).fill(0).map(row => new Array(amt).fill(false));
    for(let i = 0; i < amt; i++) {
        let innerseqdiv = document.createElement('div');
        innerseqdiv.setAttribute('class', 'dotrow');
        for(let j = 0; j < amt; j++) {
            let node = document.createElement('div');
            node.setAttribute('class', 'dot off');
            node.setAttribute('id', i.toString()+'@'+j.toString());
            node.setAttribute('row', i.toString());
            node.setAttribute('col', j.toString());
            node.onclick = onDotClick;
            node.addEventListener('webkitAnimationEnd', function(){
                this.style.webkitAnimationName = '';
            }, false);
            innerseqdiv.appendChild(node);
        }
        seq.appendChild(innerseqdiv);
    }
}

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

// event handlers
function onDotClick(e) {

    e.target.classList.remove('active');
    if(e.target.classList.contains('on')) {
        e.target.classList.remove('on');
        e.target.classList.add('off');
    } else {
        e.target.classList.remove('off');
        e.target.classList.add('on');
    }
    seqGrid[e.target.getAttribute('row')][e.target.getAttribute('col')] = !seqGrid[e.target.getAttribute('row')][e.target.getAttribute('col')];
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
    let x = e.changedTouches[0].pageX - e.target.offsetLeft;
    let y = e.changedTouches[0].pageY- e.target.offsetTop;
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

document.getElementById('sin').onclick = function(e) { resetWave(); };
document.getElementById('tri').onclick = function(e) { resetWave('tri'); };
document.getElementById('saw').onclick = function(e) { resetWave('saw'); };
document.getElementById('square').onclick = function(e) { resetWave('square'); };

// initialization
function init() {
    width = Math.floor(document.body.clientWidth*3/5);
    height = 400;

    let canv = document.getElementById('wave');
    canv.width = width;
    canv.height = height;
    wave_size = width;

    wave = new Float32Array(Array.apply(null, Array(wave_size)).map(function (_, i) {return i;}));
    delta = 1/wave_size*width;

    resetWave();
    drawWave();
    createSeq();

    let bpmslider = document.getElementById('bpm');
    noUiSlider.create(bpmslider, {start: 60, range: {'min': 20, 'max': 240}});
    bpmslider.noUiSlider.on('update', function(values, handle, unencoded){
        cur_bpm = unencoded[0];
    });
    let attackslider = document.getElementById('attack');
    noUiSlider.create(attackslider, {start: .25, range: {'min': 0, 'max': 1}});
    attackslider.noUiSlider.on('update', function(values, handle, unencoded){
        cur_attack = unencoded[0];
    });
    let releaseslider = document.getElementById('release');
    noUiSlider.create(releaseslider, {start: .25, range: {'min': .01, 'max': 1}});
    releaseslider.noUiSlider.on('update', function(values, handle, unencoded){
        cur_release = unencoded[0];
    });
    let differenceslider = document.getElementById('difference');
    noUiSlider.create(differenceslider, {start: 60, range: {'min': 10, 'max': 200}});
    differenceslider.noUiSlider.on('update', function(values, handle, unencoded){
        cur_difference = unencoded[0];
    });
    let octaveslider = document.getElementById('octave');
    noUiSlider.create(octaveslider, {start: 4, range: {'min': 2, 'max': 6}});
    octaveslider.noUiSlider.on('update', function(values, handle, unencoded){
        cur_octave = unencoded[0];
    });

    process_node.connect(compressor);
    compressor.connect(actx.destination);
}
init();
