"use strict";

import {OAuth} from 'oauth';
import express from 'express';
import cookieParser from 'cookie-parser';

let port = process.env.PORT || 5000;
let host = process.env.HOST || 'http://localhost';
if (port != 80) host += ':'+port;

let consumerKey = process.env.CONSUMER_KEY;
let consumerSecret = process.env.CONSUMER_SECRET;
if (!consumerKey || !consumerSecret) {
  console.error('環境変数 CONSUMER_KEY と CONSUMER_SECRET がない');
  process.exit(1);
}

let callbackPath = '/twitter/callback';
let oauth = new OAuth(
  'https://api.twitter.com/oauth/request_token',
  'https://api.twitter.com/oauth/access_token',
  consumerKey,
  consumerSecret,
  '1.0A',
  host+callbackPath,
  'HMAC-SHA1');

let app = express();
app.use(cookieParser());

app.get('/', (req, res) => {
  res.send('<title>hoge</title><p><a href=/twitter>twitter</a>');
});

app.get('/twitter', async (req, res) => {
  try {
    let [token, secret, results] = await getOAuthRequestToken();
    console.log(token, secret, results);
    // 本番ではセッションを使え
    res.cookie('oauthToken', token);
    res.cookie('oauthSecret', secret);
    res.redirect('https://twitter.com/oauth/authenticate?oauth_token='+token);
  }
  catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
});

app.get(callbackPath, async (req, res) => {
  try {
    let oauthToken = req.cookies.oauthToken;
    let oauthSecret = req.cookies.oauthSecret;
    let verifier = req.query['oauth_verifier'];

    let [accessToken, accessTokenSecret, results] =
      await getOAuthAccessToken(oauthToken, oauthSecret, verifier);
    console.log(accessToken, accessTokenSecret, results);
    res.send(`できた: ${accessToken}, ${accessTokenSecret}`);
  }
  catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
});

app.listen(port, () => {
  console.log('こんにちは ', port);
});

function getOAuthRequestToken(extraParams={}) {
  return new Promise((resolve, reject) => {
    oauth.getOAuthRequestToken({}, (err, token, secret, results) => {
      if (err) return reject(err);
      resolve([token, secret, results]);
    });
  });
}

function getOAuthAccessToken(oauthToken, oauthSecret, verifier) {
  return new Promise((resolve, reject) => {
    oauth.getOAuthAccessToken(oauthToken, oauthSecret, verifier,
      (err, accessToken, accessSecret, results) => {
        if (err) return reject(err);
        resolve([accessToken, accessSecret, results]);
      });
  });
}
