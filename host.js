const dgram = require('dgram');

const SERVER_HOST = '3.10.221.34'
const SERVER_PORT = 22023;
const UDP_PORT = 22023;
const FORWARDING_IP = '192.168.68.111';


const host = dgram.createSocket('udp4');


const message = Buffer.from('IHOST');

host.send(message, 0, message.length, SERVER_PORT, SERVER_HOST, (err) => {
    if (err) {
        console.error('UDP send error:', err);
        host.close();
    } else {
        console.log(`Message sent to ${SERVER_HOST}:${SERVER_PORT}`);
    }
});

host.on('message', (response, rinfo) => {

    const data = JSON.parse(response)
    console.log(`Received response from server: ${response.toString()} from ${rinfo.address}:${rinfo.port}`);
    //host.close();
    // host.send(data.MSG, 0, data.MSG.length, UDP_PORT, FORWARDING_IP, (err) => {
    //     console.log(`UDP WEB message ${data.MSG} sent to ${FORWARDING_IP}`);
    //     if (err) console.error('UDP WEB send error:', err);
    // });
});