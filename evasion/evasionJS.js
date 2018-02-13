
//Declare variables
var mainArr = new Array();						//Main array
var arrLen = [0, 0];							//Length of main array
var canvas = document.getElementById('canvas');	//Canvas element
var algs;										//Algorithm data storage
var alg;										//Used algorithm index
var currSeq = [0];								//Current sequence
var algLen = 20;								//Length of algorithm array (evolution)
var algPass;									//Current algorithm iteration
var learnMode = 'backprop';							//Learning mode to use
var learnRate = 0.01;							//Deep learning rate
var ticking = false;							//Is algorithm on?
var paused = false;								//Is paused?
var quickAlgOn = false;							//Is quick mode on?
var timeLimit = 60;								//Time limit before termination
var startTime;									//Time at the start of ticking
var delay;										//Delay between updates
var tickHdl;									//Tick handle
var animHdl;									//Animation timer handle
var animOffset = 0;								//Offset, used for animation
var currStat = 0;								//Current displayed status
var maxDensity = 0.2;							//Max amount of full blocks
var densityDist = 1.5;							//Distribution power of blocks
var coreIndex;									//Horizontal position of core in array
var limit = true; 								//Limit iteration number
var calcLayers = 1;								//Number of hidden layers
var actFunc = 'ReLU';						//Activation function
var memN = 0;									//Number of mamory nodes
var passN = 20;									//Number of passes to do

//Constants
const INPUTN = 24;
const OUTPUTN = 3;
const SCANRAD = 2;
const SCOREMAX = 100000;
const DEFCANVSIZE = [50, 50];
const MAXCANVSIZE = [1000, 1000];

//Styles
var fStyle0 = '#444'; 		//Background
var fStyle1 = '#ddd'; 		//Bars
var fStyle2 = '#f69'; 		//Dots

//Updates colors from menu
function colorsUpdate(){
	var colorMenu = document.getElementById('colorMenu');
	if (colorMenu.style.visibility === 'visible'){
		fStyle0 = document.getElementById('colorBG').value;
		fStyle1 = document.getElementById('colorBars').value;
		fStyle2 = document.getElementById('colorDots').value;
		colorMenu.style.visibility = 'collapse';
		update();
	}
	else {
		colorMenu.style.visibility = 'visible';
	}
}

//Creates calculating object
function Network(sample, rand, inLen, outLen){
	this.input = [];
	this.output = [];
	this.nodes = [];
	this.inLen = inLen;
	this.outLen = outLen;
	this.learnRate = learnRate;
	
	try {
		this.layersNum = sample.layersNum;
	}
	catch (e){
		this.layersNum = calcLayers + 2;
	}
	
	try	{
		this.memNum = sample.memNum;
	}
	catch (e){
		this.memNum = memN;
	}
	
	if (sample == null || sample.iter == null){
		this.iter = 0;
	}
	else {
		this.iter = sample.iter + 1;
	}
	
	for(let i = 0; i < inLen; i++){
		this.input[i] = 0;
	}
	for(let j = 0; j < outLen; j++){
		this.output[j] = 0;
	}
	
	for (let i = 0; i < this.layersNum; i++){
		this.nodes[i] = [];
		for (let j = 0; j < Math.round((this.outLen + this.memNum) * (i / (this.layersNum - 1)) + (this.inLen + this.memNum) * (1 - (i / (this.layersNum - 1)))); j++){
			if (i === 0){
				this.nodes[i][j] = new Node(sample == null ? null : sample.nodes[i][j], rand, i, 'input');
			}
			else if (i === this.layersNum - 1){
				this.nodes[i][j] = new Node(sample == null ? null : sample.nodes[i][j], rand, i, 'output');
			}
			else {
				this.nodes[i][j] = new Node(sample == null ? null : sample.nodes[i][j], rand, i, 'hidden');
			}
		}
	}
	for (let i = 0; i < this.nodes.length - 1; i++){
		let lenI = this.nodes[i].length;
		for (let j = 0; j < lenI; j++){
			let lenI1 = this.nodes[i + 1].length;
			for (let k = 0; k < lenI1; k++){
				this.nodes[i][j].connectTo(this.nodes[i + 1][k], sample == null ? null : sample.nodes[i][j].outLink[k], rand);
			}
		}
	}
	
	this.setInput = function(arr){
		for (let i = 0; i < this.inLen; i++){
			
			this.input[i] = (arr[i] == null ? 0 : arr[i]);
		}
	}
	
	this.process = function(){
		for (let i = 0; i < outLen; i++){
			this.output[i] = 0;
		}
		for (let j = 0; j < inLen; j++){
			this.nodes[0][j].setVal(this.input[j]);
		}
		for (let i = 0; i < this.layersNum; i++){
			let lenI = this.nodes[i].length;
			for (let j = 0; j < lenI; j++){
				this.nodes[i][j].calc();
			}
		}
		for (let i = 0; i < this.memNum; i++){
			let toMem = this.nodes[this.layersNum - 1][this.outLen + i].getRes();
			this.nodes[0][this.inLen + i].setVal((toMem == null || isNaN(toMem)) ? 0 : toMem);
		}
		for (let j = 0; j < outLen; j++){
			this.output[j] = this.nodes[this.layersNum - 1][j].getRes();
		}
	}
	
	this.backprop = function(bundle){	//bundle = array of [input, output]
		var size = bundle.length;
		var pairs = [];
		var gradient = [];
		var delta = [];
		
		for (let p = 0; p < size; p++){
			pairs[p] = {};
			pairs[p].error = [];
			pairs[p].deriv = []; 
			
			this.setInput(bundle[p][0]);
			this.process();
		
			for (let i = 0; i < this.layersNum; i++){
				pairs[p].error[i] = [];
				pairs[p].deriv[i] = [];
			}
		
			//Calculate errors
			for (let i = 0; i < bundle[p][1].length; i++){
				pairs[p].error[this.layersNum - 1][i] = this.getOutput()[i] - bundle[p][1][i];
			}
			for (let i = this.layersNum - 2; i >= 0; i--){
				let lenI = this.nodes[i].length;
				for (let j = 0; j < lenI; j++){
					pairs[p].error[i][j] = 0;
					for (let k = 0; k < this.nodes[i + 1].length; k++){
						pairs[p].error[i][j] += (this.nodes[i][j].outLink[k].weight * pairs[p].error[i + 1][k]);
					}
					pairs[p].error[i][j] *= (i !== 0 ? this.nodes[i][j].actFunc(this.nodes[i][j].val) : 1);
				}
			}
			//Calculate gradients
			for (let i = this.layersNum - 1; i > 0; i--){
				let lenI = this.nodes[i].length;
				for (let j = 0; j < lenI; j++){
					pairs[p].deriv[i][j] = [];
					let lenJ = this.nodes[i][j].inLink.length;
					pairs[p].deriv[i][j][0] = pairs[p].error[i][j];				//0th element is bias
					for (let k = 1; k <= lenJ; k++){
						pairs[p].deriv[i][j][k] = pairs[p].error[i][j] * this.nodes[i - 1][k - 1].getRes();
					} 
				}
			}
		}
		//Calculate overall gradient
		for (let i = 0; i < this.layersNum; i++){
			gradient[i] = [];
		}
		for (let i = this.layersNum - 1; i > 0; i--){
			let lenI = this.nodes[i].length;
			for (let j = 0; j < lenI; j++){
				gradient[i][j] = [];
				let lenJ = this.nodes[i][j].inLink.length;
				for (let k = 0; k <= lenJ; k++){
					if (gradient[i][j][k] == null){
						gradient[i][j][k] = 0;
					}
					for (p = 0; p < size; p++){
						gradient[i][j][k] += pairs[p].deriv[i][j][k];
					}
					gradient[i][j][k] /= size;
				} 
			}
		}
		//Delta weights
		for (let i = this.layersNum - 1; i > 0; i--){
			let lenI = this.nodes[i].length;
			delta[i] = [];
			for (let j = 0; j < lenI; j++){
				delta[i][j] = {};
				let lenJ = this.nodes[i][j].inLink.length;
				delta[i][j].bias = -this.learnRate * gradient[i][j][0];
				delta[i][j].weights = [];
				for (let k = 1; k <= lenJ; k++){
					delta[i][j].weights[k - 1] = -this.learnRate * gradient[i][j][k];
				} 
			}
		}
		return delta;
	}
	
	this.changeWeightsBy = function(delta){
		for (let i = 1; i < this.layersNum; i++){
			let lenI = this.nodes[i].length;
			for (let j = 0; j < lenI; j++){
				this.nodes[i][j].bias += delta[i][j].bias;
				let lenJ = this.nodes[i][j].inLink.length;
				for (let k = 0; k < lenJ; k++){
					this.nodes[i][j].inLink[k].weight += delta[i][j].weights[k];
				}
			}
		}
	}
	
	this.getOutput = function(){
		return this.output;
	}
	
	this.reset = function(){
		for (let i = 0; i < this.layersNum; i++){
			let lenI = this.nodes[i].length;
			for (let j = 0; j < lenI; j++){
				this.nodes[i][j].setVal(0);
			}
		}
	}
	
	this.getResult = function(){
		var result = 0;
		for (let i = 0; i < outLen; i++){
			if (this.output[i] > this.output[result]){
				result = i;
			}
			else if(this.output[i] === this.output[result]){
				if (result !== 0 && Math.round(Math.random())){
					result = i;
				}
			}
		}
		return result;
	}
}

//Algorithm data object
function AlgData(len, mode){
	this.storage = [];
	this.iter = 0;
	this.learnMode = mode;
	
	switch (learnMode){
		case 'backprop':
		this.len = 1;
		this.learnRate = learnRate;
		break;
		
		case 'evolution':
		this.len = len;
		break;
	}
	
	for (let i = 0; i < this.len; i++){
		this.storage[i] = [];
		this.storage[i][0] = new Network(null, this.learnMode === 'backprop' ? 10 : i, INPUTN, OUTPUTN);
		this.storage[i][1] = 0;
		this.storage[i][2] = 0;
		if (this.learnMode === 'backprop'){
			this.storage[i][3] = [];
		}
	}
	
	switch (this.learnMode){
		case 'backprop':
		this.newIter = function(){
			this.iter++;
			this.storage[0][3].sort((a, b) => (a[0] - b[0]));
			var totalDelta = [];
			
			//Initialize delta value
			for (i = 0; i < this.storage[0][0].layersNum; i++){
				totalDelta[i] = [];
				let lenI = this.storage[0][0].nodes[i].length;
				for (j = 0; j < lenI; j++){
					totalDelta[i][j] = {};
					totalDelta[i][j].bias = 0;
					totalDelta[i][j].weights = [];
					let lenJ = this.storage[0][0].nodes[i][j].inLink.length;
					for (k = 0; k < lenJ; k++){
						totalDelta[i][j].weights[k] = 0;
					}
				}
			}
			//Backprop sequence data - currently broken
			let seqLen = this.storage[0][3].length;
			for (let i = seqLen - 1; i < seqLen; i++){
				if (this.storage[0][3] == null || this.storage[0][3][i] == null){
					break;
				}
				let stepsLen = this.storage[0][3][i].length;
				let bundle = [];
				for (let j = 1; j < stepsLen; j++){
					bundle[j - 1] = [];
					bundle[j - 1][0] = this.storage[0][3][i][j][0];
					bundle[j - 1][1] = this.storage[0][3][i][j][1];
					let shift = (i - (seqLen - 1) / 2) / Math.abs(i - (seqLen - 1) / 2);

					for (let k = bundle[j - 1][1].length - 1; k <= 0; k--){
						bundle[j - 1][1][k] *= 2;
						//bundle[j - 1][1][k] += Math.clamp(bundle[j - 1][1][k] * 0.5 /* shift*/, -1000, 1000) * Math.pow(1.5, k - (bundle[j - 1][1].length - 1));
					}
				}
				//console.log(this.storage[0][3]);
				//console.log(bundle);
				let result = this.storage[0][0].backprop(bundle);
				//if (Math.random() < 0.05){console.log(result);}
				
				//Sum backprop results
				for (n = 1; n < this.storage[0][0].layersNum; n++){
					let lenN = this.storage[0][0].nodes[n].length;
					for (m = 0; m < lenN; m++){
						totalDelta[n][m].bias += result[n][m].bias;
						let lenM = this.storage[0][0].nodes[n][m].inLink.length;
						for (l = 0; l < lenM; l++){
							totalDelta[n][m].weights[l] += result[n][m].weights[l];
						}
					}
				}
			}
			//Reset values
			this.storage[0][0].changeWeightsBy(totalDelta);
			this.storage[0][3] = [];
			this.scoreRst(0);
			this.passRst(0);
		}
		break;
		
		case 'evolution':
		this.newIter = function(){
			let half = Math.ceil((this.len - 1) / 2);
			this.iter++;
			this.storage.sort((a, b) => ((b[2] != null && a[2] != null) ? (b[1] / b[2] - a[1] / a[2]) : 1));
			
			for (let i = 0; i <= half; i++){
				if (i + half < this.len){
					this.storage[i + half][0] = new Network(this.storage[i][0], 1, INPUTN, OUTPUTN);
				}
				else {
					break;
				}
			}
			for (let i = 0; i < this.len; i++){
			this.scoreRst(i);
			this.passRst(i);
			}
			shuffle(this.storage);
		}
		break;
	}
	
	this.addSeq = function(seq, index, score){
		this.storage[index][3].push([score].concat(seq)); 		//0th element of sequence is score
	}
	
	this.getIndex = function(index, item){
		var result;
		try {
			switch (item){
				case 'alg':
				result = this.storage[index][0];
				break;
				
				case 'score':
				result = this.storage[index][1];
				break;
				
				case 'pass':
				result = this.storage[index][2];
				break;
				
				case 'seq':
				result - this.storage[index][3];
			}
			return result;
		}
		catch(e){
			return;
		}
	}
	
	this.getLearnMode = function(){
		return this.learnMode;
	}
	
	this.scoreInc = function(index){
		this.storage[index][1] += 1;
	}
	this.scoreRst = function(index){
		this.storage[index][1] = 0;
	}
	this.passInc = function(index){
		this.storage[index][2] += 1;
	}
	this.passRst = function(index){
		this.storage[index][2] = 0;
	}
	
	this.resetAlg = function(index){
		this.storage[index][0].reset();
	}
	
	this.runAlg = function(index, input){
		let a = this.getIndex(index, 'alg');
		
		a.setInput(input);
		a.process();
		
		return a.getResult();
	}
}

//Node object
function Node(sample, rand, layer, type){
	this.layer = layer;
	this.type = type;
	this.inLink = [];
	this.outLink = [];
	this.val = 0;
	this.res = 0;
	
	if (this.type === 'hidden'){
		try {
			this.actFuncType = sample.actFuncType;
			this.actFunc = sample.actFunc;
		}
		catch (e){
			this.actFuncType = actFunc;
			switch (this.actFuncType){
				case 'sigmoid':
				this.actFunc = (x, d) => (sigmoid(x, d));
				break;
				
				case 'ReLU':
				this.actFunc = (x, d) => (ReLU(x, d));
				break;
				
				case 'LReLU':
				this.actFunc = (x, d) => (LReLU(x, d));
				break;
				
				case 'softplus':
				this.actFunc = (x, d) => (softplus(x, d));
				break;
				
				default:
				this.actFunc = (x, d) => (d ? 1 : x);
			}
		}
	}
	
	switch (this.type){
		case 'output':
		case 'hidden':
		try{
			this.bias = sample.bias;
		}
		catch (e){
			this.bias = 0;
		}
		this.bias += Math.random() * (rand == null ? 0 : rand) * Math.randSign();
		break;
		
		default:
		this.bias = 0;
	}
	
	this.connectTo = function(node, sample, rand){
		var link = new Link(sample, rand);
		this.outLink[this.outLink.length] = link;
		node.inLink[node.inLink.length] = link;
	}
	
	this.setVal = function(val){
		this.val = (val == null ? 0 : val);
	}
	
	this.getRes = function(){
		return this.res;
	}
	
	this.calc = function(){
		switch (this.type){
			case 'hidden':
			this.val = this.bias;
			for (let link of this.inLink){
				this.val += link.getOutput();
			}
			
			this.res = this.actFunc(this.val);
			
			for (let link of this.outLink){
				link.setInput(this.res);
			}
			break;
			
			case 'input':
			this.res = this.val;
			for (let link of this.outLink){
				link.setInput(this.res);
			}
			break;
			
			case 'output':
			this.val = this.bias;
			for (let link of this.inLink){
				this.val += link.getOutput();
			}
			this.res = this.val;
			break;
		}
	}
}

//Connection object
function Link (sample, rand){
	this.input = 0;
	try{
		this.weight = sample.weight;
	}
	catch (e){
		this.weight = 0;
	}
	this.weight += Math.random() * (rand == null ? 0 : rand) * Math.randSign();
	
	this.setInput = function (val){
		this.input = (val == null ? 0 : val);
	}
	
	this.getOutput = function(){
		return this.input * this.weight;
	}
}

//Grid cell
function Cell(){
	this.type = 'empty';
	
	this.setType = function(type){
		switch (type){
			case 'empty':
			case 'wall':
			case 'core':
			this.type = type;
			break;
			
			default:
			this.type = null;
		}
	}
}

//Sigmoid function
function sigmoid(x, d){
	if (d){
		return (Math.exp(x) / Math.pow(1 + Math.exp(x), 2));
	}
	return (1 / (1 + Math.exp(-x)));
}

//Rectifier function
function ReLU(x, d){
	if (d){
		return (x > 0 ? 1 : 0);
	}
	return (x > 0 ? x : 0);
}

//Rectifier function (leaky)
function LReLU(x, d){
	if (d){
		return (x > 0 ? 1 : 0.01);
	}
	return (x > 0 ? x : 0.01 * x);
}

//Softplus function
function softplus(x, d){
	if (d){
		return sigmoid(x);
	}
	return (x > 500 ? x : (x < -500 ? 0 : (Math.log(1 + Math.exp(x)))));
}

//Updates status box
function updateStat(key, str){
	var statBar = document.getElementById('statBar');
	var statText = document.getElementById('status');
	var barStyle0 = '#232'; //Idle
	var barStyle1 = '#2f2'; //Finished
	var barStyle2 = '#f42'; //Error
	var barStyle3 = '#888'; //Running 0
	var barStyle4 = '#8f2'; //Running 1
	var barStyle5 = '#fe2'; //Paused
	if (key !== 3){
		animOffset = -1;
		clearInterval(animHdl);
		animHdl = null;
	}
	switch (key){
		case 0:
		statBar.style.background = barStyle0;
		statText.innerHTML = 'Idling';
		break;
		
		case 1:
		statBar.style.background = barStyle1;
		statText.innerHTML = 'Finished';
		break;
		
		case 2:
		statBar.style.background = barStyle2;
		statText.innerHTML = 'Error: ' + str;
		break;
		
		case 3:
		statBar.style.background = ('linear-gradient(to right, '+ barStyle3 +'0%,'+ barStyle4 +'50%,'+ barStyle3 +'100%)');
		statText.innerHTML = 'Working';
		if (animHdl == null){
			animHdl = setInterval(function(){animTick(statBar, barStyle3, barStyle4)}, 20);
			animOffset = 0;
		}
		break;
		
		case 4:
		statBar.style.background = barStyle5;
		statText.innerHTML = 'Paused';
		break;
	}
	//currStat = key;
}

//Animation refresh
function animTick(ref, s0, s1){
	if (animOffset < 0){
		clearInterval(animHdl);
	}
	else {
		ref.style.background = ('linear-gradient(to right, '+s0+' '+(animOffset-100)%200+'%,'+s1+' '+(animOffset-50)%200+'%,'+s0+' '+animOffset%200+'%,'+s1+' '+(animOffset+50)%200+'%,'+s0+' '+(animOffset+100)%200+'%)');
		animOffset += 8;
		animOffset %= 100;
	}
}

//Set iteration HTML value
function setIterHTML(){
	document.getElementById('iteration').innerHTML = (`Iteration: <div class="display">${algs.iter == null ? 'Invalid' : algs.iter}</div>`);
	document.getElementById('pass').innerHTML = (`Pass: <div class="display">${algs.getIndex(alg, 'pass') == null ? 'Invalid' : algs.getIndex(alg, 'pass')}</div>`);
	document.getElementById('score').innerHTML = (`Score: <div class="display">${algs.getIndex(alg, 'score') == null ? 'Invalid' : algs.getIndex(alg, 'score')}</div>`);
	document.getElementById('alg').innerHTML = (`Algorithm: <div class="display">${alg == null ? 'Invalid' : alg}</div> from <div class="display">[0 - ${algs.len == null ? 'Invalid' : algs.len - 1}]</div>`);
}

//Gets random int from range
function getRandomInt(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

//Gets random int from range
function getRandomFloat(min, max){
    return (Math.random() * (max - min)) + min;
}

//Gets random sign
Math.randSign = function(){
	return (Math.round(Math.random()) * 2 - 1);
}

//Clamps input between 2 values
Math.clamp = function(val, min, max){
	if (val <= min){
		return min;
	}
	if (val >= max){
		return max;
	}
	return val;
}

//Wraps around if out of bounds
Math.wrap = function (indi, len){
	let ind = indi;
	while (ind < 0 || ind > len - 1){
		if (ind == null || len == null || (ind - len) == null){
			return;
		} 
		if (ind > 0){
			ind -= len;
		}
		else {
			ind += len;
		}
	}
	return ind;
}

//Swaps 2 elements in array
function swap(arr, i0, i1){
	if (i0 !== i1){
		var temp = arr[i0];
		arr[i0] = arr[i1];
		arr[i1] = temp;
	}
}

//Swaps 2 elements in 2d array
function swap2d(arr, i0, i1){
	if (i0 !== i1){
		var temp = arr[i0[0]][i0[1]];
		arr[i0[0]][i0[1]] = arr[i1[0]][i1[1]];
		arr[i1[0]][i1[1]] = temp;
	}
}

//Shuffles array
function shuffle(arr){
	var j;
	for (let i = 0; i <= arr.length - 2; i++){
		j = getRandomInt(i, arr.length-1);
		swap(arr, i, j);
	}
}

//Pauses/unpauses
function pause(){
	delay = Math.clamp(document.getElementById('delay').value, 0, 10000);
	document.getElementById('delay').value = delay;
	paused = !paused;
	if (paused){
		}
	if (tickHdl != null){
		clearTimeout(tickHdl);
		tickHdl = null;
		updateStat(4);
	}
	else {
		if (ticking){
			updateStat(currStat);
			tickHdl = setTimeout(function(){tick();}, delay);
		}
	}
}

//Initalizes grid
function initGrid(){
	ticking = false;
	mainArr.length = 0;
	arrLen = [Math.clamp(parseInt(document.getElementById('arrLenX').value), 0, 100), Math.clamp(parseInt(document.getElementById('arrLenY').value), 0, 100)];
	document.getElementById('arrLenX').value = arrLen[0];
	document.getElementById('arrLenY').value = arrLen[1];
	algLen = Math.max(document.getElementById('algLen').value, 0);
	document.getElementById('algLen').value = algLen;
	maxDensity = Math.clamp(parseFloat(document.getElementById('densityMaxIn').value), 0, 1);
	document.getElementById('densityMaxIn').value = maxDensity;
	densityDist = parseFloat(document.getElementById('densityDistIn').value);
	document.getElementById('densityDistIn').value = densityDist;
	passN = Math.clamp(parseInt(document.getElementById('passNumIn').value), 0, 1000);
	document.getElementById('passNumIn').value = passN;
	calcLayers = Math.clamp(parseInt(document.getElementById('layerNumIn').value), 0, 1000);
	document.getElementById('layerNumIn').value = calcLayers;
	memN = Math.clamp(parseInt(document.getElementById('memNumIn').value), 0, 1000);
	document.getElementById('memNumIn').value = memN;
	actFunc = document.getElementById('actFuncIn').value;
	learnMode = document.getElementById('learnModeIn').value;
	learnRate = Math.clamp(parseFloat(document.getElementById('LRateIn').value), 0, 1000);
	document.getElementById('LRateIn').value = learnRate;
	
	canvas.width = (Math.min(MAXCANVSIZE[0], DEFCANVSIZE[0] * arrLen[0])).toString();
	canvas.height = (Math.min(MAXCANVSIZE[1], DEFCANVSIZE[1] * arrLen[1])).toString();
	document.getElementById('canvBox').style.width = canvas.width + 'px';
	document.getElementById('canvBox').style.height = canvas.height + 'px';
	
	for (let i = 0; i < arrLen[0]; i++){
		mainArr[i] = [];
		for (let j = 0; j < arrLen[1]; j++){
			mainArr[i][j] = new Cell();
		}
	}
	
	coreIndex = Math.floor((arrLen[0] - 1) / 2);
	mainArr[coreIndex][0].setType('core');
	
	algs = new AlgData(algLen, learnMode);
	alg = 0;
	setIterHTML();
	
	update();
	currStat = 0;
	updateStat(0);
}

//Updates canvas
function update(){
	var size = [canvas.width, canvas.height];
	var d = [size[0] / arrLen[0], size[1] / arrLen[1]];
	var ctx = canvas.getContext('2d');
	var adj = {};
	
	ctx.strokeStyle = 'rgba(0, 0, 0, 0)';
	
	ctx.fillStyle = fStyle0;
	ctx.fillRect(0, 0, size[0], size[1]); //Clears canvas
	
	for (let i = 0; i < arrLen[0]; i++){ //Draws a cell
		for (let j = 0; j < arrLen[1]; j++){
			adj = {};
			try {
				adj.l = mainArr[Math.wrap(i - 1, arrLen[0])][j].type;
			}
			catch (e){
				adj.l = null;
			}
			try {
				adj.r = mainArr[Math.wrap(i + 1, arrLen[0])][j].type;
			}
			catch (e){
				adj.r = null;
			}
			try {
				adj.t = mainArr[Math.wrap(i, arrLen[0])][j + 1].type;
			}
			catch (e){
				adj.t = null;
			}
			try {
				adj.b = mainArr[Math.wrap(i, arrLen[0])][j - 1].type;
			}
			catch (e){
				adj.b = null;
			}
			try {
				adj.lt = mainArr[Math.wrap(i - 1, arrLen[0])][j + 1].type;
			}
			catch (e){
				adj.lt = null;
			}
			try {
				adj.lb = mainArr[Math.wrap(i - 1, arrLen[0])][j - 1].type;
			}
			catch (e){
				adj.lb = null;
			}
			try {
				adj.rt = mainArr[Math.wrap(i + 1, arrLen[0])][j + 1].type;
			}
			catch (e){
				adj.rt = null;
			}
			try {
				adj.rb = mainArr[Math.wrap(i + 1, arrLen[0])][j - 1].type;
			}
			catch (e){
				adj.rb = null;
			}
			switch(mainArr[i][j].type){
				case 'empty':
				ctx.fillStyle = fStyle0;
				break;
				
				case 'wall':
				ctx.fillStyle = fStyle1;
				ctx.beginPath();
				ctx.ellipse(i * d[0] + d[0] / 2, size[1] - (j * d[1] + d[1] / 2), d[0] / 2, d[1] / 2, 0, 0, 2 * Math.PI);
				ctx.stroke();
				ctx.fill();
				if (adj.l === 'wall'){
					ctx.fillRect(i * d[0], size[1] - (j * d[1]), d[0] / 2, - d[1]);
				}
				if (adj.r === 'wall'){
					ctx.fillRect(i * d[0] + d[0] / 2, size[1] - (j * d[1]), d[0] / 2, - d[1]);
				}
				if (adj.t === 'wall'){
					ctx.fillRect(i * d[0], size[1] - (j * d[1] + d[1] / 2), d[0], - d[1] / 2);
				}
				if (adj.b === 'wall'){
					ctx.fillRect(i * d[0], size[1] - (j * d[1]), d[0], - d[1] / 2);
				}
				if (adj.lt === 'wall'){
					
					ctx.fillRect(i * d[0], size[1] - (j * d[1] + d[1] / 2), d[0] / 2, - d[1] / 2);
					
					ctx.beginPath();
					ctx.ellipse(i * d[0] - d[0] / 2, size[1] - (j * d[1] + d[1] / 2), d[0] / 2, d[1] / 2, 0, - 0.5 * Math.PI, 0);
					ctx.lineTo(i * d[0], size[1] - (j * d[1] + d[1]));
					ctx.stroke();
					ctx.fill();
					
					ctx.beginPath();
					ctx.ellipse(i * d[0] + d[0] / 2, size[1] - (j * d[1] + d[1] * 1.5), d[0] / 2, d[1] / 2, 0, 0.5 * Math.PI, Math.PI);
					ctx.lineTo(i * d[0], size[1] - (j * d[1] + d[1]));
					ctx.stroke();
					ctx.fill();
				}
				if (adj.lb === 'wall'){
					ctx.fillRect(i * d[0], size[1] - (j * d[1]), d[0] / 2, - d[1] / 2);
					
					ctx.beginPath();
					ctx.ellipse(i * d[0] - d[0] / 2, size[1] - (j * d[1] + d[1] / 2), d[0] / 2, d[1] / 2, 0, 0, 0.5 * Math.PI);
					ctx.lineTo(i * d[0], size[1] - (j * d[1]));
					ctx.stroke();
					ctx.fill();
					
					ctx.beginPath();
					ctx.ellipse(i * d[0] + d[0] / 2, size[1] - (j * d[1] - d[1] / 2), d[0] / 2, d[1] / 2, 0, Math.PI, 1.5 * Math.PI);
					ctx.lineTo(i * d[0], size[1] - (j * d[1]));
					ctx.stroke();
					ctx.fill();
				}
				if (adj.rt === 'wall'){
					ctx.fillRect(i * d[0] + d[0] / 2, size[1] - (j * d[1] + d[1] / 2), d[0] / 2, - d[1] / 2);
					
					ctx.beginPath();
					ctx.ellipse(i * d[0] + d[0] / 2, size[1] - (j * d[1] + d[1] * 1.5), d[0] / 2, d[1] / 2, 0, 0, 0.5 * Math.PI);
					ctx.lineTo(i * d[0] + d[0], size[1] - (j * d[1] + d[1]));
					ctx.stroke();
					ctx.fill();
					
					ctx.beginPath();
					ctx.ellipse(i * d[0] + d[0] * 1.5, size[1] - (j * d[1] + d[1] / 2), d[0] / 2, d[1] / 2, 0, Math.PI, 1.5 * Math.PI);
					ctx.lineTo(i * d[0] + d[0], size[1] - (j * d[1] + d[1]));
					ctx.stroke();
					ctx.fill();
				}
				if (adj.rb === 'wall'){
					ctx.fillRect(i * d[0] + d[0] / 2, size[1] - (j * d[1]), d[0] / 2, - d[1] / 2);
					
					ctx.beginPath();
					ctx.ellipse(i * d[0] + d[0] / 2, size[1] - (j * d[1] - d[1] / 2), d[0] / 2, d[1] / 2, 0, - 0.5 * Math.PI, 0);
					ctx.lineTo(i * d[0] + d[0], size[1] - (j * d[1]));
					ctx.stroke();
					ctx.fill();
					
					ctx.beginPath();
					ctx.ellipse(i * d[0] + d[0] * 1.5, size[1] - (j * d[1] + d[1] / 2), d[0] / 2, d[1] / 2, 0, 0.5 * Math.PI, Math.PI);
					ctx.lineTo(i * d[0] + d[0], size[1] - (j * d[1]));
					ctx.stroke();
					ctx.fill();
				}
				break;
				
				case 'core':
				ctx.fillStyle = fStyle2;
				ctx.beginPath();
				ctx.ellipse(i * d[0] + d[0] / 2, size[1] - (j * d[1] + d[1] / 2), d[0] / 2, d[1] / 2, 0, 0, 2 * Math.PI);
				ctx.stroke();
				ctx.fill();
				break;
				
				default:
				continue;
			}
		}
	}
}

//Toggles ticking
function toggle(){
	if (mainArr.length > 0){
		ticking = !ticking;
		if (ticking){
			startTime = (new Date).getTime();
			delay = parseInt(Math.clamp(document.getElementById('delay').value, 0, 10000));
			document.getElementById('delay').value = delay;
			alg = Math.clamp(document.getElementById('index').value, 0, algLen - 1);
			document.getElementById('index').value = alg;
			limit = document.getElementById('limit').checked;
			
			paused = false;
			algs.resetAlg(alg);
			algs.passRst(alg);
			algs.scoreRst(alg);
			removeWalls();
			
			updateStat(3);
			currStat = 3;
			tickHdl = setTimeout(function(){tick();}, delay);
		}
		else {
			if (tickHdl != null){
				finishIter(1);
				clearTimeout(tickHdl);
				tickHdl = null;
			}
		}
	}
}


//Calculates next tick
function tick(q){
	var next = false;
	if ((q != null && q != false) || (ticking && !paused)){
		var newLine = [];
		var newLen;
		var input = [];
		var scanRad = [];
		
		if (q && !quickAlgOn){
			next = true;
		}
		
		scanRad[0] = Math.clamp(SCANRAD, 0, Math.floor((arrLen[0] - 1) / 2));
		scanRad[1] = Math.clamp(SCANRAD, 0, Math.floor((arrLen[1] - 1) / 2));
		/*for (let i0 = -scanRad; i0 <= scanRad; i0++)
		{
			var wallDist = -1;
			for (let j = 0; j < arrLen[1]; j++){
				if (mainArr[Math.wrap(coreIndex + i0, arrLen[1])][j].type === 'wall'){
					wallDist = j;
					break;
				}
			}
			input[input.length] = wallDist;
		}
		
		for (let i0 = -scanRad; i0 <= scanRad; i0++)
		{
			var wallFound = false;
			for (let j = 0; j < Math.min(arrLen[1], 3); j++){
				if (mainArr[Math.wrap(coreIndex + i0, arrLen[1])][j].type === 'wall'){
					wallFound = true;
					break;
				}
			}
			input[input.length] = wallFound;
		}*/
		for (let i0 = -scanRad[0]; i0 <= scanRad[0]; i0++){
			for (let j = 0; j <=  2 * scanRad[1]; j++){
				switch (mainArr[Math.wrap(coreIndex + i0, arrLen[0])][j].type){
					case 'empty':
					input[input.length] = 0;
					break;
					
					case 'wall':
					input[input.length] = 1;
					break;
				}
			}
		}
		
		result = algs.runAlg(alg, input);
		if (algs.learnMode === 'backprop'){
			currSeq.push([input, algs.getIndex(alg, 'alg').getOutput()]);
			currSeq[0] += 1;
		}
		algs.scoreInc(alg);
		
		switch (result){
			case 0:
			break;
			
			case 1:
			if (mainArr[Math.wrap(coreIndex - 1, arrLen[0])][0].type !== 'wall'){
				swap2d(mainArr, [coreIndex, 0], [Math.wrap(coreIndex - 1, arrLen[0]), 0]);
			}
			else {
				next = true;
			}
			break;
			
			case 2:
			if (mainArr[Math.wrap(coreIndex + 1, arrLen[0])][0].type !== 'wall'){
				swap2d(mainArr, [coreIndex, 0], [Math.wrap(coreIndex + 1, arrLen[0]), 0]);
			}
			else {
				next = true;
			}
			break;
		}
		
		
		for (let i = 0; i < arrLen[0]; i++){
			for (let j = 0; j < arrLen[1]; j++){
				switch(mainArr[i][j].type){
					case 'empty':
					break;
					case 'core':
					coreIndex = i;
					break;
				
					case 'wall':
					if (mainArr[i][j - 1] == null){
						mainArr[i][j].setType('empty');
					}
					else {
						switch(mainArr[i][j - 1].type){
							case 'empty':
							swap2d(mainArr, [i, j], [i, j - 1]);
							break;
						
							case 'wall':
							break;
						
							case 'core':
							next = true;
							break;
						}
					}
				}
			}
		}
	
		newLen = Math.round(Math.pow(getRandomFloat(0, Math.pow(arrLen[0] * maxDensity, densityDist)), 1 / densityDist));
		for (let i = 0; i < arrLen[0]; i++){
			newLine[i] = (i < newLen ? 'wall' : 'empty');
		}
		shuffle(newLine);
		for (let i = 0; i < arrLen[0]; i++){
			mainArr[i][arrLen[1] - 1].setType(newLine[i]);
		}
		
		if (!q){
			update();
		}
		if (!q){
			if (next){
				finishIter(0);
			}
			else {
				tickHdl = setTimeout(function(){tick();}, delay);
			}
		}
		else {
			return next;
		}
}
}

//Finishes current iteration
function finishIter(code){
	ticking = false;
	switch (code){
		case 0:
		reiterate();
		break;
		
		case 1:
		currStat = 2;
		updateStat(2, 'Stopped by user');
		break;
		
		default:
		currStat = 2;
		updateStat(2, 'Unknown error');
	}
	update();
}

//Launches next iteration
function reiterate(q){
	removeWalls();
	algs.passInc(alg);
	if (q && algs.getLearnMode() === 'backprop'){
		algs.addSeq(currSeq.slice(1), alg, currSeq[0]);
	}
	if (algs.getIndex(alg, 'pass') >= passN && q){
		alg++;
	}
	if (!q){
		if (!(limit && algs.getIndex(alg, 'pass') >= passN)){
			setIterHTML();
			algs.resetAlg(alg);
			ticking = true;
			tickHdl = setTimeout(function(){tick();}, delay);
		}
		else {
			currStat = 1;
			updateStat(1);
		}
	}
}

//Removes all walls
function removeWalls(){
	for (let i = 0; i < arrLen[0]; i++){
		for (let j = 0; j < arrLen[1]; j++){
			if (mainArr[i][j].type === 'wall'){
				mainArr[i][j].setType('empty');
			}
		}
	}
}

//Quickly runs iterations
function quickAlg(n){
	if (n == null){
		ticking = false;
		quickAlgOn = !quickAlgOn;
		currStat = 3;
		updateStat(3);
		var n0 = Math.clamp(document.getElementById('iterToRun').value - 1, 1, 100000);
		document.getElementById('iterToRun').value = Math.clamp(n0 + 1, 1, 100000);
		for (let i = 0; i < algs.len; i++){
			algs.passRst(i);
			algs.scoreRst(i);
		}
	}
	alg = 0;
	
	if (algs.getLearnMode === 'backprop' && quickAlgOn){
	currSeq = [0];
	}
	while (alg < algs.len && quickAlgOn){
		while(!tick(true)){
			ticking = false;
			if (algs.getIndex(alg, 'score') > SCOREMAX){
				break;
			}
		}
		if (!quickAlgOn){
			break;
		}
		algs.resetAlg(alg);
		reiterate(true);
		currSeq = [0];
	}
	
	alg--;
	setIterHTML();
	alg++;
	algs.newIter();
	
	if (n !== 0){
		if (quickAlgOn){
			setTimeout(function(){quickAlg(n == null ? n0 - 1 : n - 1);}, 0);
		}
		else {
			currStat = 2;
			updateStat(2, 'Stopped by user');
		}
	}
	else {
		quickAlgOn = false;
		currStat = 1;
		updateStat(1);
		alg = 0;
		setIterHTML();
	}
}