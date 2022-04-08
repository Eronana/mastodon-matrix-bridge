const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');
const { createBot } = require('./bot');
const authMethod = process.env.AUTH_METHOD || 'PLAIN';
const username = process.env.USERNAME || 'user';
const password = process.env.PASSWORD || 'pass';
const port = parseInt(process.env.PORT || '465');
const homeserverUrl = process.env.HOMESERVER_URL || 'https://matrix.org';
const homeServerAccessToken = process.env.HOMESERVER_ACCESS_TOKEN || '';
const usernameRegExp = new RegExp(process.env.USERNAME_REGEXP || '^([^@]+)@');
const serverName = process.env.SERVER_NAME || 'matrix.org';
const bot = createBot(homeserverUrl, homeServerAccessToken);

const server = new SMTPServer({
  authMethods: [authMethod],
  onAuth(auth, session, callback) {
    if (auth.username !== username || auth.password !== password) {
      console.log(`bad auth:`, auth, session);
      return callback(new Error('Invalid username or password'));
    }
    console.log('passed auth, session:', session);
    callback(null, { user: auth.username });
  },
  async onData(stream, session, callback) {
    const email = await simpleParser(stream);
    console.log(email);
    const to = email.headers.get('to').text;
    const g = to.match(usernameRegExp);
    if (g) {
      const userId = `@${g[1]}:${serverName}`;
      await bot(userId, {
        msgtype: 'm.text',
        body: email.text,
      });
      console.log(`sent. user: ${userId}, session:`,  session, 'content:', email.text);
      callback();
    } else {
      console.log('bad to:', to);
    }

  }
});

server.on('error', (err) => {
  console.error(`smtp server error:`, err);
});

server.listen(port);
