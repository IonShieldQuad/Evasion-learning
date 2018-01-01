
//Declare variables
var mainArr = new Array();						//Main array
var arrLen = [0, 0];							//Length of main array
var canvas = document.getElementById('canvas');	//Canvas element
var algs;										//Algorithm data storage
var alg;										//Used algorithm index
var algLen = 20;								//Length of algorithm array
var algPass;									//Current algorithm iteration
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

//Constants
const INPUTN = 24;
const OUTPUTN = 3;
const SCANRAD = 2;
const PASSN = 20;
const SCOREMAX = 100000;
const CALCLAYERS = 1;

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
	//this.linkP = [];
	//this.linkN = [];
	this.nodes = [];
	this.inLen = inLen;
	this.outLen = outLen;
	this.layersNum = CALCLAYERS + 2;
	
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
	
	/*for (let i = 0; i < this.inLen; i++){
		this.linkP[i] = [];
		this.linkN[i] = [];
		for (let j = 0; j < this.outLen; j++){
			try {
				this.linkP[i][j] = sample.linkP[i][j];
			}
			catch (e){
				this.linkP[i][j] = 0;
			}
			this.linkP[i][j] += Math.random() * (rand == null ? 0 : rand) * Math.randSign();
			try {
				this.linkN[i][j] = sample.linkN[i][j];
			}
			catch (e){
				this.linkN[i][j] = 0 ;
			}
			this.linkN[i][j] += Math.random() * (rand == null ? 0 : rand) * Math.randSign();
		}
	}*/
	for (let i = 0; i < this.layersNum; i++){
		this.nodes[i] = [];
		for (let j = 0; j < Math.round(this.outLen * (i / (this.layersNum - 1)) + this.inLen * (1 - (i / (this.layersNum - 1)))); j++){
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
	
	/*this.process = function(){
		for(let j = 0; j < outLen; j++){
			this.output[j] = 0;
		}
		for (let i = 0; i < this.inLen; i++){
			for (let j = 0; j < this.outLen; j++){
				if (this.input[i] >= 0){
					this.output[j] += this.input[i] * this.linkP[i][j];
				}
				else {
					this.output[j] += this.input[i] * this.linkN[i][j];
				}
			}
		}
	};*/
	
	this.process = function(){
		for (let i = 0; i < outLen; i++){
			this.output[i] = 0;
		}
		for (let j = 0; j < inLen; j++){
			this.nodes[0][j].setVal(this.input[j]);
		}
		for (let i = 0; i < this.nodes.length; i++){
			let lenI = this.nodes[i].length;
			for (let j = 0; j < lenI; j++){
				this.nodes[i][j].calc();
			}
		}
		for (let j = 0; j < outLen; j++){
			this.output[j] = this.nodes[this.nodes.length - 1][j].getRes();
		}
	}
	
	this.getOutput = function(){
		return this.output;
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
function AlgData(len){
	this.storage = [];
	this.len = len;
	this.iter = 0;
	
	for (let i = 0; i < this.len; i++){
		this.storage[i] = [];
		this.storage[i][0] = new Network(null, i, INPUTN, OUTPUTN);
		this.storage[i][1] = 0;
		this.storage[i][2] = 0;
	}
	
	this.newIter = function(){
		let half = Math.ceil((this.len - 1) / 2);
		this.iter++;
		this.storage.sort(function(a, b){return ((b[2] != null && a[2] != null) ? (b[1] / b[2] - a[1] / a[2]) : 1)});
		
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
			}
			return result;
		}
		catch(e){
			return;
		}
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
			this.res = (Math.random() < sigmoid(this.val) ? 1 : 0);
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
function sigmoid(x){
	return (1 / (1 + Math.exp(-x)));
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
		tickHdl = null;
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
		animHdl = setInterval(function(){animTick(statBar, barStyle3, barStyle4)}, 20);
		animOffset = 0;
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
	document.getElementById('iteration').innerHTML = (`Iteration: ${algs.iter == null ? 'Invalid' : algs.iter}`);
	document.getElementById('pass').innerHTML = (`Pass: ${algs.getIndex(alg, 'pass') == null ? 'Invalid' : algs.getIndex(alg, 'pass')}`);
	document.getElementById('score').innerHTML = (`Score: ${algs.getIndex(alg, 'score') == null ? 'Invalid' : algs.getIndex(alg, 'score')}`);
	document.getElementById('alg').innerHTML = (`Alg: ${alg == null ? 'Invalid' : alg} from [0 - ${algs.len == null ? 'Invalid' : algs.len - 1}]`);
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
	
	
	for (let i = 0; i < arrLen[0]; i++){
		mainArr[i] = [];
		for (let j = 0; j < arrLen[1]; j++){
			mainArr[i][j] = new Cell();
		}
	}
	
	coreIndex = Math.floor((arrLen[0] - 1) / 2);
	mainArr[coreIndex][0].setType('core');
	
	algs = new AlgData(algLen);
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
					let data0 = ctx.getImageData(i * d[0] - d[0] / 2, size[1] - (j * d[1] + d[1] / 2), 1, 1).data;
					let data1 = ctx.getImageData(i * d[0] + d[0] / 2 - 1, size[1] - (j * d[1] + d[1] * 1.5 - 1), 1, 1).data;
					
					ctx.fillRect(i * d[0], size[1] - (j * d[1] + d[1] / 2), d[0] / 2, - d[1] / 2);
					
					ctx.fillRect(i * d[0] - d[0] / 2, size[1] - (j * d[1] + d[1] / 2), d[0] / 2, - d[1] / 2);
					ctx.fillRect(i * d[0], size[1] - (j * d[1] + d[1]), d[0] / 2, - d[1] / 2);
					
					ctx.fillStyle = `rgba(${data0[0]}, ${data0[1]}, ${data0[2]}, ${data0[3] / 255})`;
					
					ctx.beginPath();
					ctx.ellipse(i * d[0] - d[0] / 2, size[1] - (j * d[1] + d[1] / 2), d[0] / 2, d[1] / 2, 0, - 0.5 * Math.PI, 0);
					ctx.lineTo(i * d[0] - d[0] / 2, size[1] - (j * d[1] + d[1] / 2));
					ctx.stroke();
					ctx.fill();
					
					ctx.fillStyle = `rgba(${data1[0]}, ${data1[1]}, ${data1[2]}, ${data1[3] / 255})`;
					
					ctx.beginPath();
					ctx.ellipse(i * d[0] + d[0] / 2, size[1] - (j * d[1] + d[1] * 1.5), d[0] / 2, d[1] / 2, 0, 0.5 * Math.PI, Math.PI);
					ctx.lineTo(i * d[0] + d[0] / 2, size[1] - (j * d[1] + d[1] * 1.5));
					ctx.stroke();
					ctx.fill();
					
					ctx.fillStyle = fStyle1;
				}
				if (adj.lb === 'wall'){
					let data0 = ctx.getImageData(i * d[0] - d[0] / 2, size[1] - (j * d[1] + d[1] / 2 - 1), 1, 1).data;
					let data1 = ctx.getImageData(i * d[0] + d[0] / 2 - 1, size[1] - (j * d[1] - d[1] / 2), 1, 1).data;
					
					ctx.fillRect(i * d[0], size[1] - (j * d[1]), d[0] / 2, - d[1] / 2);
					
					ctx.fillRect(i * d[0] - d[0] / 2, size[1] - (j * d[1]), d[0] / 2, - d[1] / 2);
					ctx.fillRect(i * d[0], size[1] - (j * d[1] - d[1] / 2), d[0] / 2, - d[1] / 2);
					
					ctx.fillStyle = `rgba(${data0[0]}, ${data0[1]}, ${data0[2]}, ${data0[3] / 255})`;
					
					ctx.beginPath();
					ctx.ellipse(i * d[0] - d[0] / 2, size[1] - (j * d[1] + d[1] / 2), d[0] / 2, d[1] / 2, 0, 0, 0.5 * Math.PI);
					ctx.lineTo(i * d[0] - d[0] / 2, size[1] - (j * d[1] + d[1] / 2));
					ctx.stroke();
					ctx.fill();
					
					ctx.fillStyle = `rgba(${data1[0]}, ${data1[1]}, ${data1[2]}, ${data1[3] / 255})`;
					
					ctx.beginPath();
					ctx.ellipse(i * d[0] + d[0] / 2, size[1] - (j * d[1] - d[1] / 2), d[0] / 2, d[1] / 2, 0, Math.PI, 1.5 * Math.PI);
					ctx.lineTo(i * d[0] + d[0] / 2, size[1] - (j * d[1] - d[1] / 2));
					ctx.stroke();
					ctx.fill();
					
					ctx.fillStyle = fStyle1;
				}
				if (adj.rt === 'wall'){
					let data0 = ctx.getImageData(i * d[0] + d[0] / 2, size[1] - (j * d[1] + d[1] * 1.5 - 1), 1, 1).data;
					let data1 = ctx.getImageData(i * d[0] + d[0] * 1.5 - 1, size[1] - (j * d[1] + d[1] / 2), 1, 1).data;
					
					ctx.fillRect(i * d[0] + d[0] / 2, size[1] - (j * d[1] + d[1] / 2), d[0] / 2, - d[1] / 2);
					
					ctx.fillRect(i * d[0] + d[0] / 2, size[1] - (j * d[1] + d[1]), d[0] / 2, - d[1] / 2);
					ctx.fillRect(i * d[0] + d[0], size[1] - (j * d[1] + d[1] / 2), d[0] / 2, - d[1] / 2);
					
					ctx.fillStyle = `rgba(${data0[0]}, ${data0[1]}, ${data0[2]}, ${data0[3] / 255})`;
					
					ctx.beginPath();
					ctx.ellipse(i * d[0] + d[0] / 2, size[1] - (j * d[1] + d[1] * 1.5), d[0] / 2, d[1] / 2, 0, 0, 0.5 * Math.PI);
					ctx.lineTo(i * d[0] + d[0] / 2, size[1] - (j * d[1] + d[1] * 1.5));
					ctx.stroke();
					ctx.fill();
					
					ctx.fillStyle = `rgba(${data1[0]}, ${data1[1]}, ${data1[2]}, ${data1[3] / 255})`;
					
					ctx.beginPath();
					ctx.ellipse(i * d[0] + d[0] * 1.5, size[1] - (j * d[1] + d[1] / 2), d[0] / 2, d[1] / 2, 0, Math.PI, 1.5 * Math.PI);
					ctx.lineTo(i * d[0] + d[0] * 1.5, size[1] - (j * d[1] + d[1] / 2));
					ctx.stroke();
					ctx.fill();
					
					ctx.fillStyle = fStyle1;
				}
				if (adj.rb === 'wall'){
					let data0 = ctx.getImageData(i * d[0] + d[0] / 2, size[1] - (j * d[1] - d[1] / 2), 1, 1).data;
					let data1 = ctx.getImageData(i * d[0] + d[0] * 1.5 - 1, size[1] - (j * d[1] + d[1] / 2 - 1), 1, 1).data;
					
					ctx.fillRect(i * d[0] + d[0] / 2, size[1] - (j * d[1]), d[0] / 2, - d[1] / 2);
					
					ctx.fillRect(i * d[0] + d[0] / 2, size[1] - (j * d[1] - d[1] / 2), d[0] / 2, - d[1] / 2);
					ctx.fillRect(i * d[0] + d[0], size[1] - (j * d[1]), d[0] / 2, - d[1] / 2);
					
					ctx.fillStyle = `rgba(${data0[0]}, ${data0[1]}, ${data0[2]}, ${data0[3] / 255})`;
					
					ctx.beginPath();
					ctx.ellipse(i * d[0] + d[0] / 2, size[1] - (j * d[1] - d[1] / 2), d[0] / 2, d[1] / 2, 0, - 0.5 * Math.PI, 0);
					ctx.lineTo(i * d[0] + d[0] / 2, size[1] - (j * d[1] - d[1] / 2));
					ctx.stroke();
					ctx.fill();
					
					ctx.fillStyle = `rgba(${data1[0]}, ${data1[1]}, ${data1[2]}, ${data1[3] / 255})`;
					
					ctx.beginPath();
					ctx.ellipse(i * d[0] + d[0] * 1.5, size[1] - (j * d[1] + d[1] / 2), d[0] / 2, d[1] / 2, 0, 0.5 * Math.PI, Math.PI);
					ctx.lineTo(i * d[0] + d[0] * 1.5, size[1] - (j * d[1] + d[1] / 2));
					ctx.stroke();
					ctx.fill();
					
					ctx.fillStyle = fStyle1;
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
	if (algs.getIndex(alg, 'pass') >= PASSN && q){
		alg++;
	}
	if (!q){
		if (!(limit && algs.getIndex(alg, 'pass') >= PASSN)){
			setIterHTML();
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
		reiterate(true);
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

document.getElementById('canvBox').style.width = canvas.width;
document.getElementById('canvBox').style.height = canvas.height;