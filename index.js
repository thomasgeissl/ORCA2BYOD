// import osc from "osc"
import os from "os";
import commandLineArgs from "command-line-args";
import mqtt from "mqtt";
import osc from "osc";
import { WebMidi } from "webmidi";

const optionDefinitions = [
  {
    name: "broker",
    alias: "b",
    type: String,
    defaultOption: "mqtt://localhost:1883",
  },
  { name: "topic", alias: "t", type: String, defaultOption: "byod/taxi" },
];

const options = commandLineArgs(optionDefinitions);
console.log(options);

WebMidi.enable()
  .then(onEnabled)
  .catch((err) => console.error(err));

// Function triggered when WEBMIDI.js is ready
function onEnabled() {
  // Display available MIDI input devices
  if (WebMidi.inputs.length < 1) {
    console.log("no device detected");
  } else {
    WebMidi.inputs.forEach((device, index) => {
      console.log("device", device.name);
    });
  }

  // const mySynth = WebMidi.inputs[0];
  const IAC = WebMidi.getInputByName("IAC Driver Bus 1");
  const channels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

  IAC.addListener(
    "noteon",
    (e) => {
      const payload = {
        channel: e.message.channel,
        status: 144,
        note: e.data[1],
        velocity: e.data[2],
      };
      client.publish(options.topic, JSON.stringify(payload));
    },
    { channels }
  );
  IAC.addListener(
    "noteoff",
    (e) => {
      const payload = {
        channel: e.message.channel,
        status: 128,
        note: e.data[1],
        velocity: e.data[2],
      };
      client.publish(options.topic, JSON.stringify(payload));
    },
    { channels }
  );
}

const client = mqtt.connect(options.broker);

client.on("connect", function () {
  //   client.subscribe('presence', function (err) {
  //     if (!err) {
  //       client.publish('presence', 'Hello mqtt')
  //     }
  //   })
});

client.on("message", function (topic, message) {
  console.log(message.toString());
});

const getIPAddresses = function () {
  const interfaces = os.networkInterfaces();
  const ipAddresses = [];

  for (var deviceName in interfaces) {
    var addresses = interfaces[deviceName];
    for (var i = 0; i < addresses.length; i++) {
      var addressInfo = addresses[i];
      if (addressInfo.family === "IPv4" && !addressInfo.internal) {
        ipAddresses.push(addressInfo.address);
      }
    }
  }

  return ipAddresses;
};

const udpPort = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: 49162,
});

udpPort.on("ready", function () {
  var ipAddresses = getIPAddresses();

  console.log("Listening for OSC over UDP.");
  ipAddresses.forEach(function (address) {
    console.log("Host:", address + ", Port:", udpPort.options.localPort);
  });
});

udpPort.on("message", function (oscMessage) {
  // TODO: catch not numbers error
  const channel = parseInt(oscMessage.address.replace(/\\|\//g, "")) + 1;
  let octave = 3;
  let note = 60;
  let velocity = 100;
  let duration = 100;
  // const octave = parseInt(oscMessage.address.replace(/\\|\//g,'')) + 1
  console.log(oscMessage.args);
  if (oscMessage.args.length > 0) {
    octave = oscMessage.args[0];
  }
  if (oscMessage.args.length > 1) {
    note = octave * 12 + oscMessage.args[1];
  }
  console.log(channel, note);
});

udpPort.on("error", function (err) {
  console.log(err);
});

udpPort.open();
