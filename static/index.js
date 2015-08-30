window.AudioContext = window.AudioContext || window.webkitAudioContext;

var musicLoader;

var BufferLoader = function (context, canvas) {
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext("2d");

    this.context = context;
    this.context.createGain = this.context.createGain || this.context.createGainNode;

    var analyser = this.context.createAnalyser();
    analyser.fftSize = 256;
    analyser.minDecibels = -90;
    analyser.maxDecibels = -10;
    analyser.smoothingTimeConstant = 0.85;

    this.analyser = analyser;
    this.bufferLength = analyser.frequencyBinCount;

    var reader = new FileReader();
    reader.onload = this.loadFile.bind(this);
    reader.onerror = function(error) {
        console.log('Error loading: ');
        console.log(error);
    };

    this.reader = reader;
};

BufferLoader.prototype.fileChange = function(e) {
    var self = this,
        file = e.target.files[0];

    if (!file) {
        return;
    }

    self.fileInfo = file;
    self.reader.readAsArrayBuffer(file);
};

BufferLoader.prototype.decode = function(source) {
    var self = this;

    self.context.decodeAudioData(source, function (buffer) {
        self.buffer = buffer;
        self.isLoaded = true;
    }, function (error) {
        console.log('Error loading: ');
        console.log(error);
    });
};

BufferLoader.prototype.loadFile = function(e, fileInfo) {
    console.log("track name: " + this.fileInfo.name);
    this.decode(e.target.result);
};

BufferLoader.prototype.load = function (url) {
    this.isLoaded = false;

    var self = this,
        request = new XMLHttpRequest();

    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    this.decode(request.response);

    request.onload = function () {
        self.decode(request.response);
    };

    request.send();
};

BufferLoader.prototype.changeVolume = function (fraction) {
    this.gainNode.gain.value = fraction;
};

BufferLoader.prototype.play = function () {
    if (!this.isLoaded) {
        console.log('Music track is not loaded yet');
        return;
    }

    var source = this.context.createBufferSource();
    source.buffer = this.buffer;

    //увеличивать-уменьшать громкость
    this.gainNode = this.context.createGain();

    source.connect(this.analyser);
    this.analyser.connect(this.gainNode);

    this.gainNode.connect(this.context.destination);

    this.source = source;
    this.visualize();

    this.isPlaying = true;
    this.source.start(0);
};

BufferLoader.prototype.stop = function () {
    if (!this.source) {
        return;
    }

    this.isPlaying = false;
    this.source.stop(0);
};

BufferLoader.prototype.visualize = function () {
    var self = this,
        canvasWidth = this.canvas.width,
        canvasHeight = this.canvas.height;

    var dataArray = new Uint8Array(self.bufferLength);

    this.canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);

    draw();

    function draw() {
        var drawVisual = requestAnimationFrame(draw);

        self.analyser.getByteFrequencyData(dataArray);
        self.canvasCtx.fillStyle = 'rgb(0, 0, 0)';
        self.canvasCtx.fillRect(0, 0, canvasWidth, canvasHeight);

        var barWidth = (canvasWidth / self.bufferLength) * 2.5,
            barHeight,
            x = 0,
            i;

        for (i = 0; i < self.bufferLength; i++) {
            barHeight = dataArray[i];

            self.canvasCtx.fillStyle = 'rgb(' + (barHeight + 100) + ',50,50)';
            self.canvasCtx.fillRect(x, canvasHeight - barHeight / 2, barWidth, barHeight / 2);

            x += barWidth + 1;
        }
    }
};

function init() {
    try {
        var context = new window.AudioContext();
        var canvas = document.querySelector('.visualizer');
        var play = document.querySelector('.player__button_type_play');
        var files = document.querySelector('.open_file');

        musicLoader = new BufferLoader(context, canvas);

        play.addEventListener("click", function(){
            if(!musicLoader.isLoaded) {
                return;
            }

            if(musicLoader.isPlaying) {
                musicLoader.stop();
                play.setAttribute("class", "player__button player__button_type_play");
            } else {
                musicLoader.play();
                play.setAttribute("class", "player__button player__button_type_stop");
            }
        });

        files.addEventListener("change", musicLoader.fileChange.bind(musicLoader))
    } catch (e) {
        alert('Web Audio Content is not supported in this browser');
    }
}

window.addEventListener('load', init);