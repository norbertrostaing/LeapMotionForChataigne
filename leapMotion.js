var vars = [];
var fingerNames = ["Thumb", "Index", "Middle", "Ring", "Pinky"];
var handNames = ["Left", "Right"];

function init()
{
	updateIP();
	for (var i = 0; i< 2; i++) {
		vars[i] = {};
		vars[i].container = local.values.addContainer(handNames[i]+" Hand");
		vars[i].isPresent = vars[i].container.addBoolParameter("Is Present", "is the hand present",false);
		vars[i].direction = vars[i].container.addPoint3DParameter("Direction", "direction",[0,0,0]);
		vars[i].direction.setRange([-1,-1,-1], [1,1,1]);
		vars[i].palmNormal = vars[i].container.addPoint3DParameter("Palm Normal", "Palm Normal",[0,0,0]);
		vars[i].palmNormal.setRange([-1,-1,-1], [1,1,1]);
		vars[i].palmPosition = vars[i].container.addPoint3DParameter("Palm Position", "Palm Position",[0,0,0]);
		vars[i].palmPosition.setRange([-1,0,-1], [1,1,1]);
		vars[i].palmVelocity = vars[i].container.addPoint3DParameter("Palm Velocity", "Palm Velocity",[0,0,0]);
		vars[i].palmVelocity.setRange([-2,-2,-2], [2,2,2]);
		vars[i].timeVisible = vars[i].container.addFloatParameter("Time Visible", "Time Visible",0,0);

		vars[i].grabAngle = vars[i].container.addFloatParameter("grabAngle", "grabAngle", 0 ,0, 1);
		vars[i].grabStrength = vars[i].container.addFloatParameter("grabStrength", "grabStrength", 0 ,0, 1);
		vars[i].pinchDistance = vars[i].container.addFloatParameter("pinchDistance", "pinchDistance", 0 ,0, 1);
		vars[i].pinchStrength = vars[i].container.addFloatParameter("pinchStrength", "pinchStrength", 0 ,0, 1);

		for (var j = 0; j< 5; j++) {
			var tempCont = vars[i].container.addContainer(fingerNames[j]);
			vars[i]["direction"+j] = tempCont.addPoint3DParameter(fingerNames[j]+" direction", "", [0,0,0]);
			vars[i]["direction"+j].setRange([-1,-1,-1], [1,1,1]);
			vars[i]["extended"+j] = tempCont.addBoolParameter(fingerNames[j]+" extended", "", false);
			vars[i]["tipPosition"+j] = tempCont.addPoint3DParameter(fingerNames[j]+" tipPosition", "", [0,0,0]);
			vars[i]["tipPosition"+j].setRange([-1,0,-1], [1,1,1]);
			vars[i]["carpPosition"+j] = tempCont.addPoint3DParameter(fingerNames[j]+" carpPosition", "", 0);
			vars[i]["carpPosition"+j].setRange([-1,0,-1], [1,1,1]);
		}
	}
}

function scriptParameterChanged(param)
{
	//You can use the script.log() function to show an information inside the logger panel. To be able to actuallt see it in the logger panel, you will have to turn on "Log" on this script.
	script.log("Parameter changed : "+param.name); //All parameters have "name" property
	if(param.is(myTrigger)) script.log("Trigger !"); //You can check if two variables are the reference to the same parameter or object with the method .is()
	else if(param.is(myEnumParam)) script.log("Key = "+param.getKey()+", data = "+param.get()); //The enum parameter has a special function getKey() to get the key associated to the option. .get() will give you the data associated
	else script.log("Value is "+param.get()); //All parameters have a get() method that will return their value
}

/*
 This function, if you declare it, will launch a timer at 50hz, calling this method on each tick
*/
/*
function update(deltaTime)
{
	script.log("Update : "+util.getTime()+", delta = "+deltaTime); //deltaTime is the time between now and last update() call, util.getTime() will give you a timestamp relative to either the launch time of the software, or the start of the computer.
}
*/

function updateIP() {
	local.parameters.serverPath.set(local.parameters.getChild("leapIP").get()+":6437/v6.json");
}

function moduleParameterChanged(param)
{
	if (param.isParameter()) {
		//script.log("Module parameter changed : "+param.name+" > "+param.get());
		if (param.name == "leapIP") {
			updateIP();
		} else if (param.name == "connected") {
			local.send(JSON.stringify({background: true}));
		}
	} else {
		script.log("Module parameter triggered : "+param.name);	
	}
}

/*
 This function will be called each time a value of this module has changed, meaning a parameter or trigger inside the "Values" panel of this module
 This function only exists because the script is in a module
*/
function moduleValueChanged(value)
{
	if(value.isParameter())
	{
		// script.log("Module value changed : "+value.name+" > "+value.get());	
	}else 
	{
		// script.log("Module value triggered : "+value.name);	
	}
}

/* ********** WEBSOCKET  MODULE SPECIFIC SCRIPTING ********************* */
/*

Streaming Modules (i.e. UDP and Serial Module) have specific methods that can be used to handle receiving and sendin data over the connection.
With streaming modules, there are 2 ways of sending data : either as a UTF-8 String or as separate bytes

local.send("This is my message"); //This will send the string passed in as ASCII characters 
local.sendBytes(30,210,46,255,10); //This will send all the bytes passed in as they are

*/


function wsMessageReceived(message)
{
	var data = JSON.parse(message);
	// script.log(data.hands);
	var handsId = {};
	var isPresent = [false, false];

	for (var i = 0; i < data.hands.length; i++) {
		var contId = -1;
		if (data.hands[i].type == "left") { contId = 0; }
		if (data.hands[i].type == "right") { contId = 1; }
		if (!data.hands[i].confidence >= 1) {contId = -1;}
		
		if (contId >=0) {
			isPresent[contId] = true;
		}

		vars[contId].direction.set(data.hands[i].direction);
		vars[contId].palmNormal.set(data.hands[i].palmNormal);
		vars[contId].palmPosition.set(toMeters(data.hands[i].palmPosition));
		vars[contId].palmVelocity.set(toMeters(data.hands[i].palmVelocity));
		vars[contId].timeVisible.set(data.hands[i].timeVisible);
		vars[contId].grabAngle.set(data.hands[i].grabAngle/3.141);
		vars[contId].grabStrength.set(data.hands[i].grabStrength);
		vars[contId].pinchDistance.set(data.hands[i].pinchDistance/1000.0);
		vars[contId].pinchStrength.set(data.hands[i].pinchStrength);
		handsId[""+data.hands[i].id] = contId;
	}
	for (var i = 0; i < Math.min(10,data.pointables.length); i++) {
		var contId = handsId[""+data.pointables[i].handId];
		if (contId < 2) {
			var type = data.pointables[i].type;
			vars[contId]["direction"+type].set(data.pointables[i].direction);
			vars[contId]["extended"+type].set(data.pointables[i].extended);
			vars[contId]["tipPosition"+type].set(toMeters(data.pointables[i].tipPosition));
			vars[contId]["carpPosition"+type].set(toMeters(data.pointables[i].carpPosition));
		}
	}

	for (var i = 0; i< 2; i++) {
		if (isPresent[i] && !vars[i].isPresent.get()) {
			vars[i].isPresent.set(true);
		}
		if (!isPresent[i] && vars[i].isPresent.get()) {
			vars[i].isPresent.set(false);
		}
	}
}

function toMeters(vec)
{
	return [vec[0] / 1000, vec[1] / 1000,vec[2] / 1000];
}

function wsDataReceived(data)
{
	script.log("Websocket data received : " +data);
}
