const net = require('net');
const dgram = require('dgram');

const TCP_PORT = 2023;
const UDP_PORT = 22023; 

let HOST_ADDR = null
let HOST_PORT = null

const udpServer = dgram.createSocket({type: 'udp4', reuseAddr: true});

    udpServer.on('listening', () => {
        const address = udpServer.address();
        console.log(`UDP WEB Server listening on ${address.address}:${address.port}`);
    });
    
    udpServer.on('message', (msg, rinfo) => {

        console.log(`UDP WEB Server received: ${msg} from ${rinfo.address}:${rinfo.port}`);
        
        if(`${msg}` === 'IHOST'){
            HOST_ADDR = rinfo.address,
            HOST_PORT = rinfo.port
            return
        }

        if(rinfo.address === HOST_ADDR && rinfo.port === HOST_PORT) {
            const obj = JSON.parse(msg)

            const message = Buffer.from(JSON.stringify(obj.MSG))

            udpServer.send(message, 0, message.length, obj.CP, obj.CA, (err)=>{
                console.log(`HOST MESSAGE ${message} sent to ${obj.CA}:${obj.CP}`)
                if(err) console.error('UDP WEB send error:', err)
            })
            return
        }

        if(HOST_ADDR === null){
            console.log("NO HOST YET")
            return
        }

        const response = `{"MSG":${msg == "FH" ? `"${msg}"` : msg},"CA":"${rinfo.address}","CP":${rinfo.port}}`
        
        udpServer.send(response, 0, response.length, HOST_PORT, HOST_ADDR, (err) => {
            console.log(`UDP message ${response} sent to ${HOST_ADDR}:${HOST_PORT}`);
            if (err) console.error('UDP WEB send error:', err);
        });
    });
    
    udpServer.on('error', (err) => {
        console.error(`UDP WEB Server error:\n${err.stack}`);
        udpServer.close();
    });
    
    udpServer.bind(UDP_PORT, '0.0.0.0');
    
// const tcpServer = net.createServer({ allowHalfOpen: false }, function(socket){
//     console.log('TCP client connected:', socket.remoteAddress);
    
//     socket.on('data', (data) => {
//         console.log(`TCP Server received: ${data} from ${socket.remoteAddress}:${socket.remotePort}`);

//     });
    
//     serverCallback(socket)
// });

// tcpServer.listen(TCP_PORT, () => {
//     console.log(`TCP Server listening on port ${TCP_PORT}`);
// });

// tcpServer.timeout = 0

// tcpServer.on("error", (e)=>{
//     console.log(`TCP Server error: ${e}`)
// })


  
//   function serverCallback(socket) {
//     try {
//       socket.write("vb.connect")
//       console.log("-------------------- CONNECTION ISSUES CHECK vb.connect")
  
//     } catch (e) {
//       console.log(
//         "**** DISCONNECTION ******",
//         e
//       )
  
//       socket.end()
//       socket.destroy()
//       return
//     }
// }
let tcpServer
mainServerCreateAndConfig()

function mainServerCreateAndConfig() {
    tcpServer = net.createServer({ allowHalfOpen: false }, function (socket) {
      console.log("NEW DEVICE >> ", socket.remoteAddress)
  
      serverCallback(socket)
    })
  
    tcpServer.listen(2023)
  
    tcpServer.on("error", (e) => {
      console.log("MAIN SERVER ERROR.. ", e.code)
    })
  }
  
  function serverCallback(socket) {
    try {
      socket.write("vb.connect")
      console.log("-------------------- CONNECTION ISSUES CHECK vb.connect")
  
    } catch (e) {
      console.log(
        "**** DISCONNECTION ******",
        e
      )
  
      socket.end()
      socket.destroy()
      return
    }
  }
