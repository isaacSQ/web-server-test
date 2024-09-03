const dgram = require('dgram');

const SERVER_HOST = '3.75.158.163'
const SERVER_PORT = 22023;

const client = dgram.createSocket('udp4');

const message = Buffer.from('FH');

client.send(message, 0, message.length, SERVER_PORT, SERVER_HOST, (err) => {
    if (err) {
        console.error('UDP send error:', err);
        client.close();
    } else {
        console.log(`Message sent to ${SERVER_HOST}:${SERVER_PORT}`);
    }
});

client.on('message', (response, rinfo) => {
    console.log(`Received response from server: ${response.toString()} from ${rinfo.address}:${rinfo.port}`);
    client.close();
});