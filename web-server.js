const net = require("net");
const dgram = require("dgram");
const express = require("express");

const TCP_PORT = 2023;
const UDP_PORT = 22023;

let HOST_ADDR = null;
let HOST_UDP_PORT = null;
let HOST_TCP_PORT = null;

let HOST_TCP_SOCKET;

let Clients = new Map();

setInterval(()=>{
    console.log('host', HOST_ADDR, HOST_UDP_PORT, HOST_TCP_PORT)
},5000)  

let udpClientId = {};
let tcpClientId = {};

//2024 media objects
let processObject = {
    scoreboardArr : [],
    appLanguageJson : JSON.stringify({}),
    bingoCardsObj : {},
    wheelList : {},
    locallyStoredBuzzerClips : null,
    allocatedClipsArray : [],
    currentPicture : null,
    winningTeamPic : null,
    roundPictures : null,
  };

let advertsObject = {}

//UDP SERVER

const app = express();

app.get('/', (req, res)=>{

    if(req.query?.id){

        let unid = req.query.id

        const pictureToServe = Buffer.from(processObject.currentPicture);
        res.setHeader('Content-Type', 'image/jpeg')
        res.end(pictureToServe, "binary")

        res.on("finish", function () {
            console.log('Image Served')
            const servedMsg = `{"MSG":"2024","CMD":"picture_served","UNID":"${unid}"}`
            HOST_TCP_SOCKET?.write(servedMsg);

            res.destroy()
        })

        }else{
            res.setHeader('Content-Type', 'application/json')
            res.json({error:'no_params'})
        }
})

app.get('/get_round_pictures', (req,res) => {

	if(req.query?.id){

        const zipToServe = Buffer.from(processObject.roundPictures)

		res.setHeader('Content-Type', 'application/zip')
        res.end(zipToServe, 'binary');
	}else{

		res.setHeader('Content-Type', 'application/json')
		res.json({error:'no_params'})

	}

})

/* CLIP LIST ROUTE */

app.get("/clips", (req, res) => {

    console.log(processObject.locallyStoredBuzzerClips)

      res.setHeader("Content-Type", "application/json");
      res.json(processObject.locallyStoredBuzzerClips);

});

// Run the file

/* CLIP USED ROUTE */

app.get("/clips_used", (req, res) => {

    res.setHeader('Content-Type', 'application/json')
	if(req.query?.unid){
	    const unid = req.query.unid
	    var used = []
	    var selected = -1

	//discover if device connecting has already selected a sound

	if (processObject.allocatedClipsArray.length > 0) {
		var item;
		item = processObject.allocatedClipsArray.find(function (clip) {
			return unid === clip.usedby
		});

		if (item !== undefined) selected = item.index;

		used = processObject.allocatedClipsArray
			.filter(function (clip) {
				return clip.index !== selected
			})
			.map(function (clip) {
				return clip.index
			});
	}

	var resstr = '{"used_clips": "' + used.toString() + '","selected_clip": "' + selected + '"}'

	console.log("-- SERVED CLIP USED /clips_used ---",resstr)

	res.end(resstr)

	}else{

	res.json({error:'no_params'})
	}
});

app.get('/advert-*', (req,res) => {
    //ADVERTS
    
    const filename = req.url.substr(1)
    console.log("GET ADVERT", filename)

    if(advertsObject[filename] !== undefined){
        const advertToServe = Buffer.from(advertsObject[filename])
        console.log("ADVERT EXISTS")
		res.setHeader('Content-Type', 'image/jpeg')
		res.end(advertToServe, "binary")
    } else {
        console.log("ADVERT DOES NOT EXIST")
        const msg = `{"MSG":"2024","CMD":"get_advert","FILE":"${filename}"}`
        HOST_TCP_SOCKET?.write(msg);

        const advertInterval = setInterval(()=>{
            if(advertsObject[filename]){
                clearInterval(advertInterval);
                const advertToServe = Buffer.from(advertsObject[filename])
                res.setHeader('Content-Type', 'image/jpeg')
		        res.end(advertToServe, "binary")
            } 
        }, 50)

        setTimeout(()=>{
            console.log("Advert file not found response")
            clearInterval(advertInterval)
            res.destroy()
        }, 30000)
    }
})

// /* SCOREBOARD ROUTE */

app.get('/get_scoreboard', (req,res) => {

	res.setHeader('Content-Type', 'application/json')
	//to be removed when 5.5.6 is minimum for host V5
	let isV5 = req.query?.v5 ?? false
	if(req.query?.unid){
		const unid = req.query.unid
			const scoreboardArrWithHighlight = processObject.scoreboardArr.map(item => {
			const name = isV5 ? item.name : item.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
			const owned = unid === item.id;
			  return {
			    pos: item.pos,
			    name,
			    score: item.score,
				tab_colour: item.tab_colour,
			    owned,
			  };
			});

		res.json(scoreboardArrWithHighlight)
		res.destroy()
	}else{
		res.json({error:'no_params'})
		}
})

// /* LANGUAGE ROUTE */
// app.get('/get_i18n', (req,res) => {

// 	if(req.query?.hash){
// 		process.send({ command: "lang_check_update", hash: req.query.hash })
// 	} else
// 		process.send({ command: "lang_check_update", hash: "sillysausages" })

// 	//waiting 2000 for appLanguageJson update
// 	setTimeout(function () {
// 		res.setHeader('Content-Type', 'application/json')
// 	  res.end(appLanguageJson)
// 		res.destroy()
// 	}, 2000)

// })

// /* PROFILE PICTURES ROUTE */

app.get('/winning_team_pic', (req,res) => {

    const pictureToServe = Buffer.from(processObject.winningTeamPic)

	res.setHeader('Content-Type', 'image/jpeg')
    res.end(pictureToServe,"binary")

})

// app.get('/rotated_team_pic', (req,res) => {

// 	if(req.query?.picId){
// 		const picId = req.query.picId
// 		res.setHeader('Content-Type', 'image/jpeg')
// 		res.end(
// 			fs.readFileSync(docsPath + `Player Images/${picId}.jpg`),
// 			"binary"
// 		)
// 	} else{
// 		res.json({error: 'no_params'})
// 	}

// })

// /* BINGO CARD ROUTE */

app.get('/get_bingo_card', (req,res) => {

    res.setHeader('Content-Type', 'application/json')
	if(req.query?.unid){

	const unid = req.query.unid

	var used = []
	var selected = -1

	res.json(processObject.bingoCardsObj[unid])

	}else{
		res.json({error:'no_params'})
	}
})

app.get('/get_wheel_list', (req,res) => {

	res.setHeader('Content-Type', 'application/json')
	res.json(processObject.wheelList)

})

// /* TEST ROUTE */

app.get('/test', (req,res) => {

	res.setHeader('Content-Type', 'application/json')

    res.json({
		SpeedQuizzing: true,
		media_server: true,
		req: req.url,
		daftness: 19,
	})

})

app.get('/health-check', (req,res) => {

    res.setHeader('Content-Type', 'application/json')

    res.json({"status":"healthy"})

})

app.listen(2024, () => {
  console.log("WEB Server listening on port 2024");
});

const udpServer = dgram.createSocket({ type: "udp4", reuseAddr: true });

udpServer.on("listening", () => {
  const address = udpServer.address();
  console.log(`UDP Server listening on ${address.address}:${address.port}`);
});

udpServer.on("message", (msg, rinfo) => {

  console.log("UDP From: ", rinfo.address, rinfo.port, msg.toString());
    
  if (msg == "IHOST") {
    console.log("HOST RECEIVED", rinfo);
    HOST_ADDR = rinfo.address;
    HOST_UDP_PORT = rinfo.port;
    return;
  }

  if (HOST_ADDR === null || HOST_UDP_PORT === null) {
    console.log("NO HOST UDP YET");
    kickAndClearServers();
    return;
  }

  if (msg.slice(0, 2) == "FH") {
    const unid = msg.toString().slice(3);
    const existingClient = Clients.get(unid) || {};
    
    // Merge the new data (ipAddress and udpPort) with the existing data
    const updatedClient = {
      ...existingClient,
      ipAddress: rinfo.address,
      udpPort: rinfo.port,
    };
    console.log('updating Client with 28' , unid, updatedClient)
    Clients.set(unid, updatedClient);
    udpClientId[`${rinfo.address}:${rinfo.port}`] = unid;

    const response = `{"MSG":"FH","UNID":"${unid}"}`;
    udpServer.send(response, 0, response.length, HOST_UDP_PORT, HOST_ADDR, (err) => {
      if (err) console.error("UDP WEB send error:", err);
    });
    return;
  }

  if (rinfo.address === HOST_ADDR && rinfo.port === HOST_UDP_PORT) {
    console.log('UDP From Host: ', msg.toString());
    if (msg == "PING") {
      Clients.forEach((client) => {
        const hostPingOut = Buffer.from(
          JSON.stringify({ command: "host_ping_out" })
        );
        udpServer.send(hostPingOut, 0, hostPingOut.length, client.udpPort, client.ipAddress);
      });
      return;
    }

    const obj = JSON.parse(msg);
    console.log(obj.UNID, '<<<<<');
    let message = obj.MSG;

    if (typeof obj.MSG === "object") {
      message = JSON.stringify(obj.MSG);
    } 

    const client = Clients.get(obj.UNID);
    if (client?.udpPort && client?.ipAddress) {
      udpServer.send(message, 0, message.length, client.udpPort, client.ipAddress, (err) => {
        if (err) console.error("UDP WEB send error:", err);
      });
    }
    return;
  }

  const unid = udpClientId[`${rinfo.address}:${rinfo.port}`];

  const response = `{"MSG":${msg},"UNID":"${unid}"}`;

  udpServer.send(response, 0, response.length, HOST_UDP_PORT, HOST_ADDR, (err) => {
    if (err) console.error("UDP WEB send error:", err);
  });
});

udpServer.on("error", (err) => {
  console.error(`UDP WEB Server error:\n${err.stack}`);
  udpServer.close();
  kickAndClearServers();
});

udpServer.bind(UDP_PORT, "0.0.0.0");

//---------------------------------------TCP SERVER----------------------------------------------------------------

const tcpServer = net.createServer({ allowHalfOpen: false }, function (socket) {
  console.log("TCP client connected:", socket.remoteAddress, socket.remotePort);

  socket.on("data", (data) => {
    //console.log(`TCP Server received: ${data} from ${socket.remoteAddress}:${socket.remotePort}`);

    if (data == "IHOST") {
      HOST_TCP_PORT = socket.remotePort;
      HOST_TCP_SOCKET = socket;
      console.log("TCP HOST", HOST_TCP_PORT, HOST_ADDR);
      return;
    }

    if (HOST_TCP_SOCKET === null || HOST_ADDR === null) {
      console.log("NO HOST YET");
      kickAndClearServers();
      return;
    }

    if (
        socket.remoteAddress === HOST_ADDR &&
        socket.remotePort === HOST_TCP_PORT
    ) {
        forwardTcpToClient(data);
    } else {
        forwardTcpToHost(data, socket)
    }
  });

  socket.on("error", (err) => {
    console.error(`Socket error: ${err.stack}`);
  });

  socket.on("end", () => {
    if (
      socket.remoteAddress === HOST_ADDR &&
      socket.remotePort === HOST_TCP_PORT
    ) {
    }
    const unid = tcpClientId[`${socket.remoteAddress}:${socket.remotePort}`];
    if (unid) {
      const msg = `{"MSG":"END","UNID":"${unid}"}`;
      try {
        console.log(`${unid} socket ended`, msg);
        HOST_TCP_SOCKET.write(msg);
      } catch (e) {
        console.log("HOST DEAD, CLEARING", e);
        kickAndClearServers();
      }
      Clients.delete(unid);
      delete tcpClientId[`${socket.remoteAddress}:${socket.remotePort}`];
    }
  });
  serverCallback(socket);
});

tcpServer.listen(TCP_PORT, "0.0.0.0", () => {
  console.log(`TCP Server listening on port ${TCP_PORT}`);
});

tcpServer.on("error", (e) => {
  console.log(`TCP Server error: ${e.message}`);
});

function serverCallback(socket) {
  try {
    socket.write("vb.connect", (err) => {
      if (err) {
        throw err;
      }
    });
  } catch (e) {
    console.log("**** DISCONNECTION ******", e.message);
    socket.end();
    socket.destroy();
    return;
  }
}

let dataContent = "";

function forwardTcpToClient(buffer) {
  let data = dataContent + buffer;
  if (data.includes("sm.json(")) {
    try {
      if (data.endsWith("})")) {
        dataContent = "";
      } else {
        dataContent = data;
        return;
      }
      const commands = data
        .split("sm.json(")
        .filter((command) => command.trim());

      const objects = commands.map((command) => {
        const jsonString = command.slice(0, -1);

        if (jsonString == undefined) {
          return;
        }

        console.log(jsonString.slice(0,100), 'hweo');
        const convertedJson = JSON.parse(jsonString);

        if (convertedJson.MSG === "DESTROY") {
          Clients.get(convertedJson.UNID)?.socket.end();
          Clients.get(convertedJson.UNID)?.socket.destroy();
          return;
        }

        if (convertedJson.MSG === "2024") {
            convertedJson.DATA = Buffer.from(convertedJson.DATA,"base64").toString("utf-8");
            console.log("🚀 ~ objects ~ convertedJson.DATA:", convertedJson.DATA.slice(0,100))
          switch (convertedJson.CMD) {
            case "process_init":
                processObject = JSON.parse(convertedJson.DATA);
                break;
            case "process_update":
                updateProcessObject(JSON.parse(convertedJson.DATA));
                break;
            case "get_advert":
                const advert = JSON.parse(convertedJson.DATA);
                advertsObject[advert.filename] = advert.data;
                break;
          }
          return;
        }

        convertedJson.MSG = Buffer.from(convertedJson.MSG, "base64").toString(
          "utf-8"
        );
        console.log("🚀 ~ objects ~ convertedJson.MSG:", convertedJson.MSG.slice(0,100), convertedJson.UNID)

        Clients.get(convertedJson.UNID)?.socket.write(convertedJson.MSG);

        return convertedJson;
      });

    } catch (err) {
      console.error(err);
    }
  } else {
    dataContent += data;
  }
}

let hostDataContent = ""
function forwardTcpToHost(buffer, socket) {
    let data = hostDataContent + buffer
    console.log("🚀 ~ forwardTcpToHost ~ data:", data.slice(0,50),"...", data.slice(data.length - 50))

    if(data.indexOf("qs") !== 0){
        if(data.includes("dataEnd+++++++++++")){
            console.log("MADE IT TO DATA END")
           hostDataContent = "" 
        } else{
            hostDataContent = data
            return
        }
    }
    console.log(data.slice(0,100), data.length)
    let unid = tcpClientId[`${socket.remoteAddress}:${socket.remotePort}`];

    console.log("🚀 ~ forwardTcpToHost ~ unid before:", unid)
    if (data.slice(0, 19) == "qs.connectResponse(") {
      const resUnid = data.toString().match(/\(([^,]+)/)[1];
      console.log('TCP UNID', resUnid);
  
      // Store the UNID in the tcpClientId map
      tcpClientId[`${socket.remoteAddress}:${socket.remotePort}`] = resUnid;
  
      // Retrieve the existing client data, if any
      const existingClient = Clients.get(resUnid) || {};
  
      // Set the updated client data, merging with existing data
      console.log('updating Client with', resUnid, {
        ...existingClient, 
        socket: socket     
    })

      Clients.set(resUnid, {
          ...existingClient,  // Merge any existing client data
          socket: socket      // Overwrite or add the socket field
      });
  
      // Set unid for further processing
      unid = resUnid;
  }
    console.log("🚀 ~ forwardTcpToHost ~ unid after:", unid)

    if(unid === undefined){
        console.log("UNID NOT FOUND, KICKING")
        socket.end();
        socket.destroy();
        return;
    }

      const res = `{"MSG":"${data}","UNID":"${unid}"}`;
      try {
        HOST_TCP_SOCKET.write(res);
      } catch (e) {
        console.log("HOST DEAD, CLEARING");
        kickAndClearServers();
      }
}

function kickAndClearServers() {
  console.log("HOST DISCONNECTED, CLEARING");
  HOST_ADDR = null;
  HOST_TCP_PORT = null;
  HOST_UDP_PORT = null;
  HOST_TCP_SOCKET = null;
  Clients.forEach((client) => {
    console.log(client)
    client?.socket.destroy();
  });
  Clients.clear();
  tcpClientId = {};
  udpClientId = {};
}

function updateProcessObject(obj) {
  switch (obj.command) {
    case "update_bingo":
        processObject.bingoCardsObj = obj.data;
      break;
    case "update_scoreboard":
        processObject.scoreboardArr = obj.data;
      break;
    case "store_selected_clips":
        processObject.allocatedClipsArray = obj.data;
      break;
    case "update_buzzer_clips":
        processObject.locallyStoredBuzzerClips = obj.data;
      break;
    case "start_image_server":
      console.log("IMAGE SERVER ALREADY STARTED");
      break;
    case "stop_image_server":
      console.log("IMAGE SERVER STOPPED");
      break;
    case "update_app_language_json":
        processObject.appLanguageJson = obj.data;
      break;
    case "update_wheel_list":
        processObject.wheelList = obj.data;
      break;
    case "wheel_action":
        console.log("wheel_action command")
      break;
    case "load_stream_deck":
      //loadStreamDeck();
      break;
    case "update_current_picture_question":
        processObject.currentPicture = obj.data
		break
    case "update_winning_team_pic":
        processObject.winningTeamPic = obj.data
        break
    case "update_round_pictures":
        processObject.roundPictures = obj.data
        break
    default:
        console.log("UNKNOWN COMMAND", obj.command);
  }
}
