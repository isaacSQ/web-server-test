const http = require('http');
const ProxyChain = require('proxy-chain');

const net = require('net');
const dgram = require('dgram');
const express = require('express'); 
const socketIO = require('socket.io');
const fetch = require('node-fetch');

const TCP_PORT = 2023;
const UDP_PORT = 22023; 

let HOST_ADDR = null
let HOST_UDP_PORT = null
let HOST_TCP_PORT = null

let HOST_TCP_SOCKET

let Clients = new Map()

let tcpClientId = {}


//UDP SERVER

const app = express()

// app.get('/', (req, res)=>{
//     if(req.query?.id){

//         let unid = req.query.id


        
//         const pictureToServe = fs.readFileSync(
//                                 appPath + "/images/picture_questions/current_picture_question.jpg"
//                             )
        
        
//         res.setHeader('Content-Type', 'image/jpeg')
        
//         res.end(pictureToServe, "binary")
        
//         res.on("finish", function () {
//             console.log('Image Served')
//             if(unid !== "ios2921I8C5593A46"){
//                 process.send({ command: "server_picture_served", unid: unid })
//             }
//             res.destroy()
//         })
        
        
        
        
//         }else{
        
//             res.setHeader('Content-Type', 'application/json')
//             res.json({error:'no_params'})
        
        
//         }
// })

// app.get('/get_round_pictures', (req,res) => {

// 	if(req.query?.id){

// 	let unid = req.query.id

// 	console.log("- - - - - - - - - - - - -------- PICTURES ZIP ROUTE ---------------------------- ")

// 		if(unid ==  "ios2921I8C5593A46"){

// 			console.log(unid,"- - - - - - - - - - - - -------- 404 PICTURES ZIP ROUTE 404 ---------------------------- ")

// 			res.sendStatus(500)

// 		}else{

// 			res.setHeader('Content-Type', 'application/zip')

// 			fs.readdir(appPath + "/images/roundpics", (err, files) => {
// 				res.end(
// 					fs.readFileSync(appPath + "/images/roundpics/" + files[0]),
// 					"binary"
// 				)
// 			})

// 		}

// 	}else{

// 		res.setHeader('Content-Type', 'application/json')
// 		res.json({error:'no_params'})

// 	}

// })

/* CLIP LIST ROUTE */

let locallyStoredBuzzerClips = null

app.get('/clips', (req,res) => {


	if(locallyStoredBuzzerClips == null){
		//var dataFilePath = path.join(docsPath, "._sq_imported/setdbv5.json")
		var data = [{"file":"A lot more to ogres than you think.mp3"},{"file":"Ah go on.mp3"},{"file":"Ahaaa.mp3"},{"file":"Alrighty then.mp3"},{"file":"And in the morning I'm making waffles.mp3"},{"file":"Are you having a laugh.mp3"},{"file":"Are you talking to me.mp3"},{"file":"Bazinga.mp3"},{"file":"Booyakasha.mp3"},{"file":"Born to be a popstar.mp3"},{"file":"Circle him here back of the net.mp3"},{"file":"Day four.mp3"},{"file":"Ding dong.mp3"},{"file":"Do you expect me to talk.mp3"},{"file":"Eat my waffle.mp3"},{"file":"Ere so shut up.mp3"},{"file":"Gavalaaaa.mp3"},{"file":"Goal of the month competition.mp3"},{"file":"Great Scott.mp3"},{"file":"Ha haaa.mp3"},{"file":"Hahahahaaaa Hahahahahaaaaa.mp3"},{"file":"Happy with the win.mp3"},{"file":"Hey Kids hoohoohahahaha.mp3"},{"file":"High five.mp3"},{"file":"How I got these scars.mp3"},{"file":"How you doin.mp3"},{"file":"I beg pardon.mp3"},{"file":"I dont beleive it.mp3"},{"file":"I have a cunning plan.mp3"},{"file":"I just dont see how I can make any money.mp3"},{"file":"I just need a drink.mp3"},{"file":"I like you very much.mp3"},{"file":"I'm ready.mp3"},{"file":"I've pierced my foot on a spyke.mp3"},{"file":"In Alaska hunting wolverines.mp3"},{"file":"It wasn't My Fault it was George.mp3"},{"file":"It's the wrong trousers.mp3"},{"file":"Just an oedinary lad.mp3"},{"file":"Just calm down.mp3"},{"file":"Know what I mean.mp3"},{"file":"Lamb mint sauce bang.mp3"},{"file":"Laugh.mp3"},{"file":"May the force be with you.mp3"},{"file":"Means family.mp3"},{"file":"Merry Christmas you filthy animals.mp3"},{"file":"My Precious.mp3"},{"file":"Nice to see you.mp3"},{"file":"No likey no litey.mp3"},{"file":"Oh David.mp3"},{"file":"Oh Philip.mp3"},{"file":"Oh my god.mp3"},{"file":"Oh you dirty old man.mp3"},{"file":"One million dollars.mp3"},{"file":"One point 21 jiggawatts.mp3"},{"file":"Oooh friend   friend.mp3"},{"file":"Ozzy gets his M and Ms.mp3"},{"file":"Pete's eying up my Buhnas.mp3"},{"file":"Peter come on.mp3"},{"file":"Potatoes.mp3"},{"file":"Right lets play.mp3"},{"file":"Shaken not stirred.mp3"},{"file":"Shut your mouth you'll do nuttin.mp3"},{"file":"Six thousand pounds.mp3"},{"file":"Some of the housemates.mp3"},{"file":"Stop it Zippy.mp3"},{"file":"Talk to me.mp3"},{"file":"Terrific player.mp3"},{"file":"Think McFly.mp3"},{"file":"Tina you fat lard.mp3"},{"file":"To not pay attention.mp3"},{"file":"Very very happy with the win.mp3"},{"file":"We're gonna make America great again.mp3"},{"file":"We've gone on holiday by mistake.mp3"},{"file":"Why is the rum always gone.mp3"},{"file":"X O X O.mp3"},{"file":"Yeah I know I want that one.mp3"},{"file":"Yeez have to be joking.mp3"},{"file":"Yes I can hear you Clem Fandango.mp3"},{"file":"Zoinks Lets get out of here.mp3"}]


		locallyStoredBuzzerClips = data

	}

	console.log("locallyStoredBuzzerClips SHOULD HAVE SERVED....",locallyStoredBuzzerClips)

	res.setHeader('Content-Type', 'application/json')

	res.json(locallyStoredBuzzerClips)

	})


// Run the file




/* CLIP USED ROUTE */

// app.get('/clips_used', (req,res) => {

// 	res.setHeader('Content-Type', 'application/json')

// 	if(req.query?.unid){

// 	const unid = req.query.unid

// 	var used = []

// 	var selected = -1

// 	//discover if device connecting has already selected a sound

// 	if (allocatedClipsArray.length > 0) {
// 		var item;
// 		item = allocatedClipsArray.find(function (clip) {
// 			return unid === clip.usedby
// 		});

// 		if (item !== undefined) selected = item.index;

// 		used = allocatedClipsArray
// 			.filter(function (clip) {
// 				return clip.index !== selected
// 			})
// 			.map(function (clip) {
// 				return clip.index
// 			});
// 	}

// 	var resstr = '{"used_clips": "' + used.toString() + '","selected_clip": "' + selected + '"}'

// 	console.log("-- SERVED CLIP USED /clips_used ---",resstr)

// 	res.end(resstr)

// 	}else{

// 	res.json({error:'no_params'})
// 	}

// })





// app.get('/advert-*', (req,res) => {
// 	//ADVERTS

// 	console.log(req.url)

// 	var filename = req.url.substr(1)

// 	var pth = docsPath + "/._sq_imported/_handset_slides/";

// 	fs.readFile(pth + filename, function (err, file) {
// 		//in case
// 		if (err) file = fs.readFileSync(pth + "-sq-advert-1.jpg")

// 		res.setHeader('Content-Type', 'image/jpeg')

// 		res.end(file, "binary")

// 		res.on('finish', function() {
// 					console.log('Image Served')
// 		      process.send({'command':'server_advert_served',ip:res.remoteAddress})
// 		   })

// 	})


// })

// /* SCOREBOARD ROUTE */

// app.get('/get_scoreboard', (req,res) => {

// 	res.setHeader('Content-Type', 'application/json')
// 	//to be removed when 5.5.6 is minimum for host V5
// 	let isV5 = req.query?.v5 ?? false
// 	//  ----  //
// 	if(req.query?.unid){

// 		const unid = req.query.unid

// 			const scoreboardArrWithHighlight = scoreboardArr.map(item => {
// 				// ---
// 			const name = isV5 ? item.name : item.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
// 				// ---
// 			const owned = unid === item.id;
// 			  return {
// 			    pos: item.pos,
// 			    name,
// 			    score: item.score,
// 				tab_colour: item.tab_colour,
// 			    owned,
// 			  };
// 			});


// 		res.json(scoreboardArrWithHighlight)
// 		res.destroy()

// 		}else{

// 		res.json({error:'no_params'})

// 		}

// })

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

// app.get('/winning_team_pic', (req,res) => {

// 	res.setHeader('Content-Type', 'image/jpeg')

// 	res.end(
// 		fs.readFileSync(docsPath + "Player Images/current_winning_team.jpg"),
// 		"binary"
// 	)

// })

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

// app.get('/get_bingo_card', (req,res) => {

// 	//console.log("-------------- - - - - - - - - BINGO CARD REQ... ",req.url, req.query)

// 	if(req.query?.unid){

// 	const unid = req.query.unid

// 	//console.log("BINGO CARD",unid,bingoCardsObj[unid])

// 	var used = []

// 	var selected = -1

// 	res.setHeader('Content-Type', 'application/json')

// 	res.json(bingoCardsObj[unid])
// 	//res.destroy()

// 	}else{
// 		res.json({error:'no_params'})
// 	}

// })

// app.get('/get_wheel_list', (req,res) => {

// 	//console.log("-------------- - - - - - - - - BINGO CARD REQ... ",req.url, req.query)


// 	const unid = req.query.unid

// 	//console.log("BINGO CARD",unid,bingoCardsObj[unid])

// 	res.setHeader('Content-Type', 'application/json')

// 	res.json(wheelList)
// 	//res.destroy()


// })


// /* WHEEL ROUTE */

// app.get('/get_wheel', (req,res) => {



// 	res.sendFile(publicPath + `/wheel.html`)

// })
// app.get('/assets/FontManifest.json', (req,res) => {
// 	res.json([])
// })

// /* TEST ROUTE */

// app.get('/test', (req,res) => {

// 	res.setHeader('Content-Type', 'application/json')

//     res.json({
// 		SpeedQuizzing: true,
// 		media_server: true,
// 		req: req.url,
// 		daftness: 19,
// 	})

// })


// app.get('/health-check', (req,res) => {

//     res.setHeader('Content-Type', 'application/json')

//     res.json({"status":"healthy"})

// })

app.listen(2024, ()=>{
    console.log('WEB Server listening on port 2024');
})

// const webServer = net.createServer({ allowHalfOpen: false }, function(socket) {
//     console.log('web client connected:', socket.remoteAddress, socket.remotePort);

//     socket.on('data', (data) => {
//         console.log(`WEB Server received: ${data}`);
//         try{
//             HOST_TCP_SOCKET.write(data)
//         } catch(e) {
//             console.log("WEB HOST DEAD, CLEARING")
//             kickAndClearServers()
//         }
//     });

//     socket.on('error', (err) => {
//         console.error(`Socket error: ${err.stack}`);
//     });

//     socket.on('end', () => {
//         console.log("END")
        
//     });

// });

// webServer.listen(2024, '0.0.0.0', () => {
//     console.log(`WEB Server listening on port 2024`);
// });


// webServer.on("error", (e) => {
//     console.log(`WEB Server error: ${e.message}`);
// });


const udpServer = dgram.createSocket({type: 'udp4', reuseAddr: true});

    udpServer.on('listening', () => {
        const address = udpServer.address();
    });
    
    udpServer.on('message', (msg, rinfo) => {        
        if(msg == 'IHOST'){
            console.log("HOST RECEIVED", rinfo)
            HOST_ADDR = rinfo.address
            HOST_UDP_PORT = rinfo.port

            // proxy = httpProxy.createProxyServer({
            //     target: 'http://192.168.4.179',
            //     //target: 'http://' + HOST_ADDR + ':2024', 
            //     changeOrigin: true,
            //     });
            //     console.log("---->", proxy)
            //     webServer = http.createServer((req, res) => {
            //         console.log("REQ RES", req, res)
            // proxy.web(req, res, (err) => {
            //     console.log("HERE HERE HERE")
            //     if (err) {
            //         console.error('Error with proxy: ', err);
            //         res.writeHead(500, { 'Content-Type': 'text/plain' });
            //         res.end('Proxy error: ' + err.message);
            //     }
            // });

            // webServer.listen(2024, '0.0.0.0',() => {
            //     console.log('Proxy server is running on http://aws-server-ip:8080');
            //     });
            // });

            // console.log("======>", webServer)

            return
        }

        if(HOST_ADDR === null || HOST_UDP_PORT === null){
            console.log("NO HOST UDP YET")
            kickAndClearServers()
            return
        }

        if(msg.slice(0,2) == 'FH'){
            const unid = msg.toString().slice(3)
            Clients.set(unid, {ipAddress: rinfo.address, udpPort: rinfo.port})
            const response = `{"MSG":"FH","CP":${rinfo.port},"CA":"${rinfo.address}"}`
            udpServer.send(response, 0, response.length, HOST_UDP_PORT, HOST_ADDR, (err) => {
                if (err) console.error('UDP WEB send error:', err);
            });
            return
        }

        if(rinfo.address === HOST_ADDR && rinfo.port === HOST_UDP_PORT) {
            if(msg == 'PING'){
                Clients.forEach((client)=>{
                    const hostPingOut = Buffer.from(JSON.stringify({command:"host_ping_out"}))
                    udpServer.send(hostPingOut, 0, hostPingOut.length, client.udpPort, client.ipAddress)
                })
                return
            }

            const obj = JSON.parse(msg)

            //console.log(`sending ${msg} to:`, obj.CA, obj.CP)

            let message = obj.MSG
            //console.log("🚀 ~ udpServer.on ~ obj.MSG:", obj.MSG)

            if(typeof obj.MSG === 'object'){
                message = JSON.stringify(obj.MSG)
            }

            //console.log("🚀 ~ udpServer.on ~ message:", message)

            udpServer.send(message, 0, message.length, obj.CP, obj.CA, (err)=>{
                //console.log(`HOST MESSAGE ${message} sent to ${obj.CA}:${obj.CP}`)
                if(err) console.error('UDP WEB send error:', err)
            })
            return
        }

        const response = `{"MSG":${msg},"CP":${rinfo.port},"CA":"${rinfo.address}"}`
        
        udpServer.send(response, 0, response.length, HOST_UDP_PORT, HOST_ADDR, (err) => {
            //console.log(`UDP message ${response} sent to ${HOST_ADDR}:${HOST_UDP_PORT}`);
            if (err) console.error('UDP WEB send error:', err);
        });
    });
    
    udpServer.on('error', (err) => {
        console.error(`UDP WEB Server error:\n${err.stack}`);
        udpServer.close();
        kickAndClearServers()
    });
    
    udpServer.bind(UDP_PORT, '0.0.0.0');

    //---------------------------------------TCP SERVER----------------------------------------------------------------
    
const tcpServer = net.createServer({ allowHalfOpen: false }, function(socket) {
        console.log('TCP client connected:', socket.remoteAddress, socket.remotePort);
    
        socket.on('data', (data) => {
            //console.log(`TCP Server received: ${data} from ${socket.remoteAddress}:${socket.remotePort}`);

            if(data == 'IHOST'){
                HOST_TCP_PORT = socket.remotePort
                HOST_TCP_SOCKET = socket
                console.log("TCP HOST", HOST_TCP_PORT, HOST_ADDR)
                return
            }

            if(HOST_TCP_SOCKET === null){
                console.log("NO HOST TCP YET")
                kickAndClearServers()
                return
            }

            if(socket.remoteAddress === HOST_ADDR && socket.remotePort === HOST_TCP_PORT){
                forwardTcpToClient(data)
            } else {
                if(data.slice(0,19) == "qs.connectResponse("){
                    const unid = data.toString().match(/\(([^,]+)/)[1]
                    Clients.set(unid, {...Clients.get(unid), tcpPort: socket.remotePort, socket: socket})
                    tcpClientId[`${socket.remoteAddress}:${socket.remotePort}`] = unid
                }

                const res = `{"MSG":"${data}","CP":${socket.remotePort},"CA":"${socket.remoteAddress}"}`
                try{
                    HOST_TCP_SOCKET.write(res)
                } catch(e) {
                    console.log("HOST DEAD, CLEARING")
                    kickAndClearServers()
                }
            }

        });
    
        socket.on('error', (err) => {
            console.error(`Socket error: ${err.stack}`);
        });
    
        socket.on('end', () => {
            if (socket.remoteAddress === HOST_ADDR && socket.remotePort === HOST_TCP_PORT) {

            }
            unid = tcpClientId[`${socket.remoteAddress}:${socket.remotePort}`]
            if(unid){
                const msg = `{"MSG":"END","UNID":"${unid}"}`
                try{
                    console.log(`${unid} socket ended`, msg)
                    HOST_TCP_SOCKET.write(msg)
                } catch(e) {
                    console.log("HOST DEAD, CLEARING", e)
                    kickAndClearServers()
                }
                Clients.delete(unid)
                delete tcpClientId[`${socket.remoteAddress}:${socket.remotePort}`]
            }
            
        });
    
        serverCallback(socket);
    });
    
    tcpServer.listen(TCP_PORT, '0.0.0.0', () => {
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

    function forwardTcpToClient(data){
        //console.log("🚀 ~ forwardTcpToClient ~ data:", data.toString())
        if (`${data}`.includes("sm.json(")) {
            try {
              const commands = `${data}`.split("sm.json(").filter((command) =>  command.trim())
                
            //console.log("🚀 ~ forwardTcpToClient ~ commands:", commands)
              const objects = commands.map((command) => {
                const jsonString = command.slice(0, -1)
      
                if (jsonString == undefined) {
                  return
                }
                //console.log("JSON STRING", jsonString)
                const convertedJson = JSON.parse(jsonString)

                if(convertedJson.MSG === 'DESTROY'){
                    Clients.get(convertedJson.UNID)?.socket.end()
                    Clients.get(convertedJson.UNID)?.socket.destroy()
                    return
                }
                
                if(convertedJson.MSG === 'UPDATE'){
                    convertedJson.DATA = Buffer.from(convertedJson.DATA, "base64").toString('utf-8')
                    console.log("UPDATED MEDIA DATA OBJ", convertedJson.DATA)
                    return
                }

                convertedJson.MSG = Buffer.from(convertedJson.MSG, "base64").toString("utf-8")
                //console.log("🚀 ~ objects ~ convertedJson.MSG:", convertedJson.MSG)
                

                const unid = tcpClientId[`${convertedJson.CA}:${convertedJson.CP}`]

                Clients.get(unid)?.socket.write(convertedJson.MSG)
      
                return convertedJson
              })
      
              //console.log("🚀 ~ forwardTcpToClient ~ objects:", objects)
            } catch (err) {
              console.error(err)
            }
          }
    }

    function kickAndClearServers() {
        console.log("HOST DISCONNECTED, CLEARING")
        HOST_ADDR = null
        HOST_TCP_PORT = null
        HOST_UDP_PORT = null
        HOST_TCP_SOCKET = null
        Clients.forEach((client)=>{
            client.socket.destroy()
        })
        Clients.clear()
      }
        

