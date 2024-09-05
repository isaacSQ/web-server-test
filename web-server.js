const net = require('net');
const dgram = require('dgram');

const TCP_PORT = 2023;
const UDP_PORT = 22023; 

let HOST_ADDR = null
let HOST_UDP_PORT = null
let HOST_TCP_PORT = null

let HOST_TCP_SOCKET = null

let clients = {}

//UDP SERVER

const udpServer = dgram.createSocket({type: 'udp4', reuseAddr: true});

    udpServer.on('listening', () => {
        const address = udpServer.address();
        console.log(`UDP WEB Server listening on ${address.address}:${address.port}`);
    });
    
    udpServer.on('message', (msg, rinfo) => {

        console.log(`UDP WEB Server received: ${msg} from ${rinfo.address}:${rinfo.port}`);
        
        if(msg == 'IHOST'){
            HOST_ADDR = rinfo.address,
            HOST_UDP_PORT = rinfo.port
            return
        }

        if(HOST_ADDR === null || HOST_UDP_PORT === null){
            console.log("NO HOST UDP YET")
            return
        }

        if(rinfo.address === HOST_ADDR && rinfo.port === HOST_UDP_PORT) {
            const obj = JSON.parse(msg)

            const message = Buffer.from(JSON.stringify(obj.MSG))
            console.log("🚀 ~ udpServer.on ~ message:", message)

            udpServer.send(obj.MSG, 0, obj.MSG.length, obj.CP, obj.CA, (err)=>{
                //console.log(`HOST MESSAGE ${message} sent to ${obj.CA}:${obj.CP}`)
                if(err) console.error('UDP WEB send error:', err)
            })
            return
        }


        const response = `{"MSG":${msg == "FH" ? `"${msg}"` : msg},"CP":${rinfo.port},"CA":"${rinfo.address}"}`
        
        udpServer.send(response, 0, response.length, HOST_UDP_PORT, HOST_ADDR, (err) => {
            //console.log(`UDP message ${response} sent to ${HOST_ADDR}:${HOST_UDP_PORT}`);
            if (err) console.error('UDP WEB send error:', err);
        });
    });
    
    udpServer.on('error', (err) => {
        console.error(`UDP WEB Server error:\n${err.stack}`);
        udpServer.close();
    });
    
    udpServer.bind(UDP_PORT, '0.0.0.0');

    //---------------------------------------TCP SERVER----------------------------------------------------------------
    
const tcpServer = net.createServer({ allowHalfOpen: false }, function(socket) {
        console.log('TCP client connected:', socket.remoteAddress, socket.remotePort);
    
        socket.on('data', (data) => {
            //console.log(`TCP Server received: ${data} from ${socket.remoteAddress}:${socket.remotePort}`);

            if(data == 'IHOST'){
                HOST_ADDR = socket.remoteAddress
                HOST_TCP_PORT = socket.remotePort
                HOST_TCP_SOCKET = socket
                return
            }

            if(HOST_TCP_SOCKET === null){
                //console.log("NO HOST TCP YET")
                socket.destroy()
                return
            }

            if(clients[`${socket.remoteAddress}:${socket.remotePort}`] === undefined){
                //console.log("ADDING CLIENT", `${socket.remoteAddress}:${socket.remotePort}`)
                clients[`${socket.remoteAddress}:${socket.remotePort}`] = socket
            }
            
            if(socket.remoteAddress === HOST_ADDR && socket.remotePort === HOST_TCP_PORT){
                forwardTcpToClient(data)
                //console.log("forward host tcp message to client")
                return
            }

            const res = `{"MSG":"${data}","CP":${socket.remotePort},"CA":"${socket.remoteAddress}"}`
            try{
                //console.log("Write to host tcp", res)
                HOST_TCP_SOCKET.write(res)
            } catch(e) {
                console.log("HOST DEAD, CLEARING")
                kickAndClearServers()
            }

        });
    
        socket.on('error', (err) => {
            console.error(`Socket error: ${err.stack}`);
        });
    
        socket.on('end', () => {
            //console.log(`Client disconnected: ${socket.remoteAddress}`);
            if (socket.remoteAddress == HOST_ADDR && socket.remotePort == HOST_TCP_PORT) {
                kickAndClearServers()
              } else {
                delete clients[`${socket.remoteAddress}:${socket.remotePort}`]
              }
        });
    
        serverCallback(socket);
    });

    tcpServer.timeout = 0;
    
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
                console.log("-------------------- CONNECTION ISSUES CHECK vb.connect");
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
      
                const convertedJson = JSON.parse(jsonString)
      
                convertedJson.MSG = Buffer.from(convertedJson.MSG, "base64").toString("utf-8")
                //console.log("🚀 ~ objects ~ convertedJson.MSG:", convertedJson.MSG)
      
                clients[`${convertedJson.CA}:${convertedJson.CP}`].write(convertedJson.MSG)
      
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
        HOST_TCP_SOCKET = null
        for (const client in clients) {
          clients[client].destroy()
        }
        clients = {}
      }
        

