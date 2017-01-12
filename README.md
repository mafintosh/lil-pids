# lil-pid

Dead simple process manager with few features

```
npm install -g lil-pid
```

First create a file with the commands you wanna have running

```
# assuming this file is called 'services'
node server.js
node another-server.js
```

Then simply start lil-pid with the filename

```
lil-pid ./services
```

It'll watch the file so every time you update it, old processes
no longer referenced from the file will be shutdown and any new ones will be spawned.

lil-pid will forward all stdout, stderr to its own stdout, stderr prefixed with the process id.

It will also tell you when a command has been spawned, exited.

That's it!

## Pro-tip

Spawn lil-pid /home/username/services with your OS' service monitor. Then it'll startup at boot
and every thing you'll need to do is edit the services file

## License

MIT
