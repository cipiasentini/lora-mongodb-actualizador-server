const express = require('express');
const serveStatic = require("serve-static")
const path = require('path');
const proxy = require('http-proxy-middleware');
const fetch = require('node-fetch');

global.Headers = fetch.Headers;
global.base64 = {
    encode: function(str) {
      return Buffer.from(str).toString('base64');
    },
  };
require('dotenv').config();

var app = express();
const port = process.env.PORT || 80;
var router = express.Router();

app.use(serveStatic(path.join(__dirname, 'dist')));
app.use(
    '/rest',
    proxy({ target: 'https://dass.yeap.com.ar', changeOrigin: true })
);

const mongoose = require('mongoose');
mongoose.connect(process.env.DATABASE_CONNECTION_STRING, { useNewUrlParser: true });
var Schema = mongoose.Schema;

var mensajeSchema = new Schema({
    time:  String,
    data: String
});
var Mensaje = mongoose.model('Mensaje', mensajeSchema, 'Mensaje');

router.route('/database/mensajes')
.get(function(req, res) {
  Mensaje.find(function(err, mensaje) {
    if (err){
      res.send(err);
    }
    res.json(mensaje);
  });
});

router.route('/database/post')
.get(function(req, res) {
    let url = process.env.URL_LATEST;
    let username = process.env.USERNAME;
    let password = process.env.PASSWORD;
    let headers = new Headers();
    headers.set('Authorization', `Basic ${base64.encode(`${username}:${password}`)}`);
    const request = async () => {
      const response = await fetch(url, {method: 'GET', headers: headers});
      const json = await response.json();
      return json;
    }
    request()
    .then(data => {
      const time = data.timestamp;
      Mensaje.findOne({ time: `${time}` }, function (err, msj) {
        if (err) res.send(err);
        if (!msj) {
          var mensaje = new Mensaje();
          mensaje.time = time;
          mensaje.data = data.dataFrame;
          mensaje.save();
          res.json({mensaje: 'Nuevo mensaje registrado en la BD mongoDB'});
        } else{
          res.json({mensaje: 'Ya existe un mensaje igual en la BD mongoDB'});
        }
      })
    })
});

app.use('/api', router);
app.listen(port);

var http = require("http");

setInterval(function() {
  // http.get('http://www.xeracto.com:2525/api/database/post');
  http.get('http://127.0.0.1:8080/api/database/post');
}, 60000)