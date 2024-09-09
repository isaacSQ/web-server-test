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


app.get('*', async(req, res)=>{
    try{
        console.log(`WEB Server`,req.url)
        //const targetURL = `http://82.71.58.81:2024${req.originalUrl}`
        const targetURL = `http://192.168.4.179:2024${req.url}`
        console.log(fetch)
        const response = await fetch(targetURL)
        console.log("🚀 ~ app.get ~ response:", response)
        const data = await response.json()
        console.log("🚀 ~ app.get ~ data:", data)

        res.status(response.status).json(data)

    } catch(e){
        console.log(`Failed to fetch web server`, e)
    }

})

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
        

