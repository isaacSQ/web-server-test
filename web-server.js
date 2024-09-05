const net = require('net');
const dgram = require('dgram');

const TCP_PORT = 2023;
const UDP_PORT = 22023; 

let HOST_ADDR = null
let HOST_UDP_PORT = null
let HOST_TCP_PORT = null

let HOST_TCP_SOCKET = null

const clients = {}

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

            udpServer.send(message, 0, message.length, obj.CP, obj.CA, (err)=>{
                console.log(`HOST MESSAGE ${message} sent to ${obj.CA}:${obj.CP}`)
                if(err) console.error('UDP WEB send error:', err)
            })
            return
        }


        const response = `{"MSG":${msg == "FH" ? `"${msg}"` : msg},"CP":${rinfo.port},"CA":"${rinfo.address}"}`
        
        udpServer.send(response, 0, response.length, HOST_UDP_PORT, HOST_ADDR, (err) => {
            console.log(`UDP message ${response} sent to ${HOST_ADDR}:${HOST_UDP_PORT}`);
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
            console.log(`TCP Server received: ${data} from ${socket.remoteAddress}:${socket.remotePort}`);

            if(data == 'IHOST'){
                HOST_ADDR = socket.remoteAddress
                HOST_TCP_PORT = socket.remotePort
                HOST_TCP_SOCKET = socket
                return
            }

            if(HOST_TCP_SOCKET === null){
                console.log("NO HOST TCP YET")
                return
            }
            
            console.log("🚀 ~ socket.on ~ socket == HOST_TCP_SOCKET:", socket == HOST_TCP_SOCKET, socket, HOST_TCP_SOCKET)
            if(socket == HOST_TCP_SOCKET){
                forwardTcpToClient(data)
                console.log("forward host tcp message to client")
                return
            }

            const res = `{"MSG":"${data}","CP":${socket.remotePort},"CA":"${socket.remoteAddress}"}`
            forwardTcpToHost(res)

        });
    
        socket.on('error', (err) => {
            console.error(`Socket error: ${err.message}`);
        });
    
        socket.on('end', () => {
            console.log(`Client disconnected: ${socket.remoteAddress}`);
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

        clients[`${obj.CA}:${obj.CP}`]

        const obj = JSON.parse(data);

        const message = Buffer.from(JSON.stringify(obj.MSG))
        
        const client = new net.Socket()

        client.connect(obj.CP, obj.CA, function(){
            client.write(message, (err) => {
                console.log(`🚀HOST MESSAGE ${msg} sent to ${obj.CA}:${obj.CP}`)
                if(err){
                    console.error('TCP send error:', err)
                } 
            })
            client.destroy()
        })
    }


    function forwardTcpToHost(res){
        
        const client = new net.Socket()

        client.connect(HOST_TCP_PORT, HOST_ADDR, function(){
            client.write(res, (err) => {
                console.log(`🚀Message ${res} sent to Host ${HOST_ADDR}:${HOST_TCP_PORT}`)
                if(err){
                    console.log("🚀 ~ client.write ~ err:", err)
                    console.error('TCP send error:', err)
                } 
            })
            client.destroy()
        })
    }

