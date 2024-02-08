import express from 'express';
import path from 'path';
import session from 'express-session';
import type { RequestHandler } from 'express';
import morgan from 'morgan';
import passport from 'passport';
import connectSessionSequelize from 'connect-session-sequelize';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

import  { db } from './db';
import  authRouter  from './routes/auth';
import  mapRouter   from './routes/map';
import imageRouter from './routes/image';

import {uploadPhoto, getFileStream } from './services/s3';

const secret: string = process.env.EXPRESS_SECRET ?? 'default';
const SequelizeStore = connectSessionSequelize(session.Store);

const app = express();

// MIDDLEWARE
app.use(morgan('dev')); // logger
app.use(express.json({limit: '10mb'})); // body parser
app.use(express.urlencoded({ extended: false, limit: '10mb' })); // url-encoded body parser
app.use(express.static(path.resolve(__dirname, '../client/dist')));

// Authentication session middleware
app.use(session({
  secret,
  resave: false,
  saveUninitialized: false,
  store: new SequelizeStore({ db })
}));
app.use(passport.authenticate('session'));

const checkLoggedIn: RequestHandler = (req, res, next) => {
  console.log(req.isAuthenticated());
  if (req.isAuthenticated()) {
    next();
  }
  res.redirect('/login');
};

// protected routes in this array
// app.use(['/map', '/tours', '/icon', '/images'], checkLoggedIn);

// ROUTES
app.use('/', authRouter);
app.use('/maps', mapRouter);
app.use('/images', imageRouter);

// ** API ROUTES **

// GET image from s3
app.get('/api/images/:key', (req, res) => {
  const { key } = req.params;
  const readStream = getFileStream(key);

  readStream.pipe(res);
});

// POST image to S3
app.post('/api/images', (req, res) => {
  const { imageName, base64 } = req.body;
  // const { id } = req.user[0];
  console.log('user data ', req.user);
  uploadPhoto(imageName, base64)
    .then((data) => {
      // axios.post('images/post', {
      //   image: {
      //     id_user: req.user[0].id,
      //     largeImg: data.Key
      //   }
      // });
      res.send(data).status(201);
      console.log('uploadData ', data);
    })
    .catch((err) => {
      console.error('upload error ', err);
      res.sendStatus(500);
    });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(3000, () => {
  console.info('Gallivant server listening on port 3000. http://localhost:3000');
});
