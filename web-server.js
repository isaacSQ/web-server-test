const net = require("net");
const dgram = require("dgram");
const express = require("express");
const axios = require("axios");
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const TCP_PORT = 2023;
const UDP_PORT = 22023;

const quizzes = new Map();

let HOST_ADDR = null;
let HOST_TCP_PORT = null;

let HOST_TCP_SOCKET;

let clients = new Map();

// setInterval(()=>{
//     console.log('host', processObject)
// },5000)

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
  };

//UDP SERVER

const app = express();

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));

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

// Setup multer to store images in memory or in a specific folder
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, 'adverts');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath); // Upload to 'uploads' folder
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Unique filename
  }
});

const zipStorage = multer.diskStorage({
    destination: function (req, res, cb){
        const uploadPath = path.join(__dirname, 'roundpics')
        if (fs.existsSync(uploadPath)) {
            fs.rmSync(uploadPath, { recursive: true, force: true });
        }
        fs.mkdirSync(uploadPath);
        cb(null, uploadPath);
    }, 
    filename: function(req, file, cb){
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });
const zipUpload = multer({storage: zipStorage})

app.post('/upload_images', upload.array('images', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const filePaths = req.files.map(file => `/adverts/${file.filename}`);

  // Respond with the paths to the uploaded images
  res.json({ message: 'Images uploaded successfully', filePaths: filePaths });
});

// POST route for image upload
app.post('/upload_image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  // Respond with the path to the uploaded image
  const filePath = `/adverts/${req.file.filename}`;
  res.json({ message: 'Image uploaded successfully', filePath: filePath });
});

app.post('/process_init', (req, res)=>{
    console.log("PROCESS INIT")
    processObject = req.body
    res.send("POST Request Called")
})

app.post('/process_update', (req, res)=>{
    updateProcessObject(req.body);

    res.send("POST Request Called")
})

app.post('/advert-*', upload.single('file') , (req, res)=>{
    const filename = req.url.slice(1)
    const filePath = path.join(__dirname, 'adverts', filename);

    if(fs.existsSync(filePath)){
        //console.log("ADVERT ALREADY EXISTS")
        return res.status(400).json({ error: "File already exists" });
    }

    if(!req.file){
        return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log("UPLOADING ADVERT:", req.file.filename);
    
    res.status(200).json({ message: "File uploaded successfully", file: req.file.filename });

})

app.post('/post_round_pictures', zipUpload.single('file'), (req, res) => {
    console.log("ZIP:", req.file)

    if(!req.file){
        return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log("UPLOADING ZIP:", req.file.filename);
    
    res.status(200).json({ message: "File uploaded successfully", file: req.file.filename });
})

app.get('/get_round_pictures', (req,res) => {
    if(req.query?.id){
        fs.readdir(path.join(__dirname, 'roundpics'), (err, files) => {
            if(files){
                const filePath = path.join(__dirname, 'roundpics', files[0]);
                res.setHeader('Content-Type', 'application/zip')
                res.sendFile(filePath);
            } else {
                res.setHeader('Content-Type', 'application/json')
                res.json({error:'no_params'})
            }
        })
    } else {
		res.setHeader('Content-Type', 'application/json')
		res.json({error:'no_params'})
    }
})

app.get("/clips", (req, res) => {

    //console.log(processObject.locallyStoredBuzzerClips)

      res.setHeader("Content-Type", "application/json");
      res.json(processObject.locallyStoredBuzzerClips);

});

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

	//console.log("-- SERVED CLIP USED /clips_used ---",resstr)

	res.end(resstr)

	}else{

	res.json({error:'no_params'})
	}
});

app.get('/advert-*', (req,res) => {
    //ADVERTS
    
    const filename = req.url.slice(1)

    const filePath = path.join(__dirname, 'adverts', filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
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
//     console.log("HERE HERE HERE HERE --------------------------------------------------")
//     const hash = req.query?.hash ? req.query.hash : "sillysausages"
//     const servedMsg = `{"MSG":"2024","CMD":"lang_check_update","HASH":"${hash}"}`
//     HOST_TCP_SOCKET?.write(servedMsg);
// 		process.send({ command: "lang_check_update", hash: req.query.hash })


// 	//waiting 2000 for appLanguageJson update
// 	setTimeout(function () {
// 	    res.setHeader('Content-Type', 'application/json')
// 	    res.end(processObject.appLanguageJson)
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
  console.log(msg.toString())
    
  if (msg == "IHOST") {
    console.log("🚀 ~ udpServer.on ~ rinfo.address:", rinfo.address)
    const quizCode = rinfo.address.split(".").join("").slice(-4)
    console.log("🚀 ~ udpServer.on ~ quizCode:", quizCode)
    //const quizCode = msg.toString().slice(6)
    console.log("current quizzes",quizzes, quizCode)

    if(quizzes.get(quizCode)){
      console.log("quiz code already exists")
      const response = `CODE USED`;
      udpServer.send(response, 0, response.length, rinfo.port, rinfo.address, (err) => {
        if (err) console.error("UDP WEB send error:", err);
      });
      return
    } else {
      quizzes.set(quizCode, {host: {ipAddress: rinfo.address, udpPort: rinfo.port}, code: quizCode, clients: []})
    }

    console.log("HOST RECEIVED", quizzes.get(quizCode));
    return
    }

  if (msg.slice(0, 2) == "FH") {
    const splitMsg = msg.toString().split(":")
    const quizCode = splitMsg[1]

    if(!quizzes.get(quizCode)){
      console.log("quiz code not found")
      return
    }

    const unid = splitMsg[2]

    const quiz = quizzes.get(quizCode)
    quiz.clients.push(unid)
    quizzes.set(quizCode, {...quiz})

    const existingClient = clients.get(unid) || {};
    
    // Merge the new data (ipAddress and udpPort) with the existing data
    const updatedClient = {
      ...existingClient,
      ipAddress: rinfo.address,
      udpPort: rinfo.port,
      unid: unid,
      quizCode: quizCode,
    };
    //console.log('updating Client with 28' , unid, updatedClient)
    clients.set(unid, updatedClient);

    sendUdpToHost(quizCode, `"FH"`, unid)
    return;
  }

  let msgFromHost = false
  quizzes.forEach(({host, code})=>{
    if(host.udpPort === rinfo.port && host.ipAddress === rinfo.address){
      msgFromHost = true
      if (msg == "PING") {
        clients.forEach((client) => {
          if(client.quizCode === code){
            const hostPingOut = Buffer.from(
              JSON.stringify({ command: "host_ping_out" })
            );
            if(client['udpPort']){
              udpServer.send(hostPingOut, 0, hostPingOut.length, client.udpPort, client.ipAddress);
            }
          }
          });
      } else {
        const obj = JSON.parse(msg);
        let message = obj.MSG;
    
        if (typeof obj.MSG === "object") {
          message = JSON.stringify(obj.MSG);
        } 
    
        const client = clients.get(obj.UNID);
        if (client?.udpPort && client?.ipAddress) {
          udpServer.send(message, 0, message.length, client.udpPort, client.ipAddress, (err) => {
            if (err) console.error("UDP WEB send error:", err);
          });
        }
      }
    }
  })

  if(!msgFromHost) {
    clients.forEach((client)=>{
        if(client.udpPort === rinfo.port && client.ipAddress === rinfo.address){
            sendUdpToHost(client.quizCode, msg, client.unid)
        }
    })
  }
});

udpServer.on("error", (err) => {
  console.error(`UDP WEB Server error:\n${err.stack}`);
  udpServer.close();
  kickAndClearServers();
});

udpServer.bind(UDP_PORT, "0.0.0.0");

const sendUdpToHost = (quizCode, msg, unid) => {
  const host = quizzes.get(quizCode).host
  const response = `{"MSG":${msg},"UNID":"${unid}"}`;
  udpServer.send(response, 0, response.length, host.udpPort, host.ipAddress, (err) => {
    if (err) console.error("UDP WEB send error:", err);
  });
}

//---------------------------------------TCP SERVER----------------------------------------------------------------

const tcpServer = net.createServer({ allowHalfOpen: false }, function (socket) {
  console.log("TCP client connected:", socket.remoteAddress, socket.remotePort);

  socket.on("data", (data) => {
    //console.log(`TCP Server received: ${data} from ${socket.remoteAddress}:${socket.remotePort}`);

    if (data.slice(0,5) == "IHOST") {
      const quizCode = data.toString().slice(6)
      console.log("current quizzes",quizzes, quizCode)
      if(!quizzes.get(quizCode)){
        console.log("quiz code not found, something went wrong. need to send back message to start again")
        return
      }
      const quiz = quizzes.get(quizCode);
      quiz.host.tcpPort = socket.remotePort
      quiz.host.socket = socket

      quizzes.set(quizCode, { ...quiz });

      socket.host = true
      socket.quizCode = quizCode

      console.log("TCP HOST", quizzes.get(quizCode).host);
      return;
    }

    if (socket.host) {
        forwardTcpToClient(data);
    } else {
        forwardTcpToHost(data, socket)
    }
  });

  socket.on("error", (err) => {
    console.error(`Socket error: ${err.stack}`);
  });

  socket.on("end", () => {
    console.log("TCP client disconnected");
    if (socket.host) {
      console.log("HOST DISCONNECTED, CLEARING");
      //clear quiz and clients
      //kickAndClearQuiz();
      return
    } 

    writeToHost(socket, 'END')

    const unid = socket?.unid

    console.log("🚀 ~ socket.on ~ unid:", unid)
    if (unid) {
      clients.delete(unid);
      console.table(clients);
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

function writeToHost(socket, msg){
  
  if(socket.unid === undefined || socket.quizCode === undefined){
    console.log("UNID or QUIZ CODE NOT FOUND, KICKING. Socket: ", socket, clients)
    socket.end();
    socket.destroy();
    return;
  }
  
  const res = `{"MSG":"${msg}","UNID":"${socket.unid}"}`
  try{
    const hostSocket = quizzes.get(socket.quizCode).host.socket
    hostSocket.write(res)
  } catch(e){
    console.log("HOST DEAD, CLEARING", e);
    kickAndClearQuiz();
  }
  const unid = socket.unid
  const quizCode = socket.quizCode

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

        //need a check here so doesn't error if can't be parsed
        const convertedJson = JSON.parse(jsonString);

        if (convertedJson.MSG === "DESTROY") {
          clients.get(convertedJson.UNID)?.socket.end();
          clients.get(convertedJson.UNID)?.socket.destroy();
          return;
        }

        convertedJson.MSG = Buffer.from(convertedJson.MSG, "base64").toString(
          "utf-8"
        );
        console.log("🚀 ~ objects ~ convertedJson.MSG:", convertedJson.MSG.slice(0,100), convertedJson.UNID)

        clients.get(convertedJson.UNID)?.socket.write(convertedJson.MSG);

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

    if(data.indexOf("qs") !== 0){
        if(data.includes("dataEnd+++++++++++")){
            console.log("MADE IT TO DATA END. SIZE: ", data.length)
            console.log("data:", data.slice(0,20),"...", data.slice(data.length - 100))
           hostDataContent = "" 
        } else{
            hostDataContent = data
            return
        }
    }
    
    if (data.slice(0, 19) == "qs.connectResponse(") {
        const connectResponseUnid = data.toString().match(/\(([^,]+)/)[1];
        // Retrieve the existing client data, if any
        const existingClient = clients.get(connectResponseUnid) || {};
        socket.unid = connectResponseUnid
        socket.quizCode = existingClient?.quizCode
        // Set the updated client data, merging with existing data
        clients.set(connectResponseUnid, {
            ...existingClient,  // Merge any existing client data
            socket: socket,
        });
    }

    writeToHost(socket, data)
}

function kickAndClearQuiz(quizCode) {
  console.log("HOST DISCONNECTED, CLEARING");

  const quiz = 
  clients.forEach((client) => {
    if(client.quizCode === quizCode){

    }
    console.log(client)
    client?.socket?.destroy();
  });
  clients.clear();
  HOST_ADDR = null;
  HOST_TCP_PORT = null;
  HOST_UDP_PORT = null;
  HOST_TCP_SOCKET = null;

  deleteStorage();
}

const deleteStorage = () => {
    const files = fs.readdirSync(__dirname)

    files.filter(file => file === 'adverts' || file === 'roundpics').forEach((file) => {
        console.log("Deleting:", file)
            const filePath = path.join(__dirname, file)
            fs.rmSync(filePath, { recursive: true, force: true });
    })
  };

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
    case "update_app_language_json":
        processObject.appLanguageJson = obj.data;
      break;
    case "update_wheel_list":
        processObject.wheelList = obj.data;
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
        console.log("UNUSED COMMAND", obj.command, obj.data);
  }
}

// setInterval(()=>{
//     fs.readdir(__dirname + '/adverts', (err, data)=>{
//         console.log("CURRENT ADVERT DISK STORAGE", data)
//     })
//     fs.readdir(__dirname + '/roundpics', (err, data)=>{
//         console.log("CURRENT ROUND PICTURES DISK STORAGE", data)
//     })
// }, 5000)