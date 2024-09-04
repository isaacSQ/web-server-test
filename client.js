const dgram = require('dgram');

const SERVER_ADDR = '3.10.221.34'
const SERVER_PORT = 22023;

const client = dgram.createSocket('udp4');

//const message = Buffer.from(`{"command":"host_sync","device_time":${Date.now()}}`);
const message = Buffer.from('FH')

client.send(message, 0, message.length, SERVER_PORT, SERVER_ADDR, (err) => {
    if (err) {
        console.error('UDP send error:', err);
        client.close();
    } else {
        console.log(`Message ${message} sent to ${SERVER_ADDR}:${SERVER_PORT}`);
    }
});

client.on('message', (response, rinfo) => {
    console.log(`Received response from server: ${response.toString()} from ${rinfo.address}:${rinfo.port}`);
    client.close();
});
