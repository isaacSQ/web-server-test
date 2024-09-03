const net = require('net');
const dgram = require('dgram');

const TCP_PORT = 2023;
const UDP_PORT = 22023; 
const FORWARDING_IP = '192.168.68.111';

let host = null

const udpServer = dgram.createSocket({type: 'udp4', reuseAddr: true});

    udpServer.on('listening', () => {
        const address = udpServer.address();
        console.log(`UDP WEB Server listening on ${address.address}:${address.port}`);
    });
    
    udpServer.on('message', (msg, rinfo) => {

        if(!host){
            console.log("NO HOST YET")
            return
        }

        if(msg === 'IHOST'){
            host = {
                HOST_ADDR: rinfo.address,
                HOST_PORT: rinfo.port
            }
        }

        const response = {MSG: msg, CLIENT_ADDR: rinfo.address, CLIENT_PORT: rinfo.port}

        console.log(`UDP WEB Server received: ${msg} from ${rinfo.address}:${rinfo.port}`);
        
        udpServer.send(response, 0, response.length, host.HOST_ADDR, host.HOST_PORT, (err) => {
            console.log(`UDP WEB message ${response} sent to ${host.HOST_ADDR}`);
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
            
            udpServer.send(data, 0, data.length, UDP_PORT, FORWARDING_IP, (err) => {
                console.log(`UDP WEB message sent to`)
                if (err) console.error('UDP WEB send error:', err);
            });
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