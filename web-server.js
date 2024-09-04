const net = require('net');
const dgram = require('dgram');

const TCP_PORT = 2023;
const UDP_PORT = 22023; 
const FORWARDING_IP = '192.168.68.111';

let HOST_ADDR = null
let HOST_PORT = null

const udpServer = dgram.createSocket({type: 'udp4', reuseAddr: true});

    udpServer.on('listening', () => {
        const address = udpServer.address();
        console.log(`UDP WEB Server listening on ${address.address}:${address.port}`);
    });
    
    udpServer.on('message', (msg, rinfo) => {

        console.log(`UDP WEB Server received: -${msg}- from ${rinfo.address}:${rinfo.port}`);
        
        if(`${msg}` === 'IHOST'){
            HOST_ADDR = rinfo.address,
            HOST_PORT = rinfo.port
            return
            // const response = Buffer.from('HOST SET');
            // udpServer.send(response, 0, response.length, HOST_PORT, HOST_ADDR, (err) => {
            //     console.log(`UDP WEB message ${response} sent to ${HOST_ADDR}`);
            //     if (err) console.error('UDP WEB send error:', err);
            // });
        }

        if(rinfo.address === HOST_ADDR && rinfo.port === HOST_PORT) {
            console.log(`HOST MESSAGE`)
            const obj = JSON.parse(msg)
            console.log("🚀 ~ udpServer.on ~  obj:",  obj)

            const message = Buffer.from(JSON.stringify(obj.MSG))

            udpServer.send(message, 0, message.length, obj.CP, obj.CA, (err)=>{
                console.log(`HOST MESSAGE ${obj.MSG} sent to ${obj.CA}:${obj.CP}`)
                if(err) console.error('UDP WEB send error:', err)
            })
            return
        }

        if(HOST_ADDR === null){
            console.log("NO HOST YET")
            return
        }

        const response = `{"MSG":${msg},"CA":"${rinfo.address}","CP":${rinfo.port}}`
        
        udpServer.send(response, 0, response.length, HOST_PORT, HOST_ADDR, (err) => {
            console.log(`UDP WEB message ${response} sent to ${HOST_ADDR}`);
            if (err) console.error('UDP WEB send error:', err);
        });
    });
    
    udpServer.on('error', (err) => {
        console.error(`UDP WEB Server error:\n${err.stack}`);
        udpServer.close();
    });
    
    udpServer.bind(UDP_PORT, '0.0.0.0');
    
    const tcpServer = net.createServer((socket) => {
        console.log('TCP client connected:', socket.remoteAddress);
        
        socket.on('data', (data) => {
            console.log(`TCP Server received: ${data} from ${socket.remoteAddress}:${socket.remotePort}`);

        });
        
    socket.on('end', () => {
        console.log('TCP client disconnected');
    });

    socket.on('error', (err) => {
        console.error(`TCP Server error:\n${err.stack}`);
    });
});

tcpServer.listen(TCP_PORT, () => {
    console.log(`TCP Server listening on port ${TCP_PORT}`);
});