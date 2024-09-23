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

const clients = new Map();

//2024 media objects

//UDP SERVER

const app = express();

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));

app.get('/', (req, res)=>{

  const {id, code} = req.query
    if(id && code){
        const quiz = quizzes.get(code)

        const pictureToServe = Buffer.from(quiz.processObject.currentPicture);
        res.setHeader('Content-Type', 'image/jpeg')
        res.end(pictureToServe, "binary")

        res.on("finish", function () {
            console.log('Image Served')
            const servedMsg = `{"MSG":"2024","CMD":"picture_served","UNID":"${id}"}`
            quiz.host.socket.write(servedMsg)

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
    const uploadPath = path.join(__dirname, req.query.code, 'adverts');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, {recursive: true});
    }
    cb(null, uploadPath); // Upload to 'uploads' folder
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Unique filename
  }
});

const zipStorage = multer.diskStorage({
    destination: function (req, res, cb){
        const uploadPath = path.join(__dirname, req.query.code, 'roundpics')
        if (fs.existsSync(uploadPath)) {
            fs.rmSync(uploadPath, { recursive: true, force: true });
        }
        fs.mkdirSync(uploadPath, {recursive: true});
        cb(null, uploadPath);
    }, 
    filename: function(req, file, cb){
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });
const zipUpload = multer({storage: zipStorage})

app.post('/process_init', (req, res)=>{
  console.log("PROCESS INIT")
  const {code} = req.query
  quizzes.get(code).processObject = req.body
  res.send("POST Request Called")
})

app.post('/process_update', (req, res)=>{
    updateProcessObject(req.query.code, req.body);

    res.send("POST Request Called")
})

app.post('/advert-*', upload.single('file') , (req, res)=>{
  const {code} = req.query
    const filename = req.url.slice(1)
    const filePath = path.join(__dirname, code, 'adverts', filename);

    if(fs.existsSync(filePath)){
        //console.log("ADVERT ALREADY EXISTS")
        return res.status(400).json({ error: "File already exists" });
    }

    if(!req.file){
        return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log("UPLOADING ADVERT:", req.file.filename, " TO ", code);
    
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
  const {id, code} = req.query
    if(id && code){
        fs.readdir(path.join(__dirname, code, 'roundpics'), (err, files) => {
            if(files){
                const filePath = path.join(__dirname, code, 'roundpics', files[0]);
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
  const {code} = req.query
  const quiz = quizzes.get(code)
      res.setHeader("Content-Type", "application/json");
      res.json(quiz.processObject.locallyStoredBuzzerClips);
});

app.get("/clips_used", (req, res) => {

  const {unid, code} = req.query

    res.setHeader('Content-Type', 'application/json')
	if(unid && code){
    const quiz = quizzes.get(code)
	    var used = []
	    var selected = -1

	//discover if device connecting has already selected a sound

	if (quiz.processObject.allocatedClipsArray.length > 0) {
		var item;
		item = quiz.processObject.allocatedClipsArray.find(function (clip) {
			return unid === clip.usedby
		});

		if (item !== undefined) selected = item.index;

		used = quiz.processObject.allocatedClipsArray
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
    const {code} = req.query
    
    const filename = req.url.slice(1)

    const filePath = path.join(__dirname, code, 'adverts', filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
})

// /* SCOREBOARD ROUTE */

app.get('/get_scoreboard', (req,res) => {

	res.setHeader('Content-Type', 'application/json')
  const {unid, code} = req.query
	//to be removed when 5.5.6 is minimum for host V5
	let isV5 = req.query?.v5 ?? false
	if(unid && code){
    const quiz = quizzes.get(code)
			const scoreboardArrWithHighlight = quiz.processObject.scoreboardArr.map(item => {
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
  const {code} = req.query

    const pictureToServe = Buffer.from(quizzes.get(code).processObject.winningTeamPic)

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

  const {unid, code} = req.query

    res.setHeader('Content-Type', 'application/json')
	if(unid && code){
  const quiz = quizzes.get(code)

	res.json(quiz.processObject.bingoCardsObj[unid])

	}else{
		res.json({error:'no_params'})
	}
})

app.get('/get_wheel_list', (req,res) => {

  const quiz = quizzes.get(req.query.code)

	res.setHeader('Content-Type', 'application/json')
	res.json(quiz.processObject.wheelList)

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

const generateQuizCode = (attempts = 0) => {
  if(attempts > 9999){
    console.log("Failed to generate a unique quiz code after 10000 attempts.")
    return null;
  }

  const quizCode = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  if(quizzes.get(quizCode)){
    console.log("quiz code already exists. Generate random quiz code")
    return generateQuizCode(attempts + 1)
  }
  return quizCode
}

udpServer.on("message", (msg, rinfo) => {
  console.log(msg.toString())
    
  if (msg == "IHOST") {
    console.log("🚀 ~ udpServer.on ~ rinfo.address:", rinfo.address)
    let quizCode = rinfo.address.split(".").join("").slice(-4)
    console.log("quiz code and current quizzes:", quizCode, quizzes)

    if(quizzes.get(quizCode)){
      console.log("quiz code already exists. Generate random quiz code")
      quizCode = generateQuizCode()
    } 

    const processObject = {
      scoreboardArr : [],
      appLanguageJson : JSON.stringify({}),
      bingoCardsObj : {},
      wheelList : {},
      locallyStoredBuzzerClips : null,
      allocatedClipsArray : [],
      currentPicture : null,
      winningTeamPic : null,
    };

    quizzes.set(quizCode, 
                {host: {ipAddress: rinfo.address, udpPort: rinfo.port}, 
                code: quizCode, 
                clients: [], 
                processObject: processObject
              })
    
    const response = `{"CODE":"${quizCode}"}`;
    udpServer.send(response, 0, response.length, rinfo.port, rinfo.address, (err) => {
      if (err) console.error("UDP WEB send error:", err);
    });
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

    quizzes.get(quizCode).clients.push(unid)

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
      
      socket.host = true
      socket.quizCode = quizCode

      quizzes.get(quizCode).host.socket = socket

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
      kickAndClearQuiz();
      return
    } 
    
    const unid = socket?.unid
    if (unid) {
      clients.delete(unid);
      console.table(clients);
    } 

    writeToHost(socket, 'END')
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

  const quiz = quizzes.get(quizCode)
  quiz.clients.forEach(unid => {
    const client = clients.get(unid)
    client?.socket?.end();
    client?.socket?.destroy();
    clients.delete(unid);
  })
  deleteStorage(quizCode);
}

function deleteStorage(quizCode){
    fs.rmSync(path.join(__dirname, quizCode), { recursive: true, force: true })
  };

function updateProcessObject(quizCode, obj){

  const processObjectKey = {
    update_bingo: 'bingoCardsObj',
    update_scoreboard: 'scoreboardArr',
    store_selected_clips: 'allocatedClipsArray',
    update_app_language_json: 'appLanguageJson',
    update_wheel_list: 'wheelList',
    update_current_picture_question: 'currentPicture',
    update_winning_team_pic: 'winningTeamPic',
  }

  quizzes.get(quizCode).processObject[processObjectKey[obj.command]] = obj.data
}

setInterval(()=>{
    fs.readdir(__dirname, (err, data)=>{
        console.log("CURRENT DISK STORAGE", data)
    })
}, 5000)