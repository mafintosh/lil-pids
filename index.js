#!/usr/bin/env node

var fs = require('fs')
var respawn = require('respawn')

var filename = process.argv[2]

if (!filename) {
  console.error('Usage: lil-pids [services-file]')
  process.exit(1)
}

if (!fs.existsSync(filename)) {
  console.error(filename + ' does not exist')
  process.exit(2)
}

var padding = ['', ' ', '  ', '   ', '    ']
var services = []
var spawned = {}

fs.watch(filename, update)
update()

function update () {
  read(function (err, latest) {
    if (err) throw err

    var added = []
    var removed = []

    services.forEach(function (s) {
      if (latest.indexOf(s) === -1) stop(s)
    })
    latest.forEach(function (s) {
      if (services.indexOf(s) === -1) start(s)
    })

    services = latest
  })
}

function stop (cmd) {
  spawned[cmd].stop()
  delete spawned[cmd]
}

function start (cmd) {
  var m = spawned[cmd] = respawn(['sh', '-c', cmd], {
    maxRestarts: Infinity
  })

  m.on('spawn', onspawn)
  m.on('exit', onexit)
  m.on('stdout', onstdout)
  m.on('stderr', onstderr)

  m.start()

  function onstdout (message) {
    onlog('(out)', message)
  }

  function onstderr (message) {
    onlog('(err)', message)
  }

  function onspawn () {
    console.log(prefix(m.pid) + '!!!!! SPAWN ' + cmd)
  }

  function onexit (code) {
    console.log(prefix(m.pid) + '!!!!! EXIT(' + code + ') ' + cmd)
  }

  function onlog (type, message) {
    var ln = message.toString().split('\n')
    for (var i = 0; i < ln.length; i++) ln[i] = prefix(m.pid) + type + ' ' + ln[i]
    console.log(ln.join('\n'))
  }
}

function read (cb) {
  fs.readFile(filename, 'utf-8', function (err, source) {
    if (err && err.code === 'ENOENT') return cb(null, [])
    if (err) return cb(err)

    var lines = source.trim().split('\n')
      .map(function (line) {
        return line.trim()
      })
      .filter(function (line) {
        return line && line[0] !== '#'
      })

    cb(null, lines)
  })
}

function prefix (pid) {
  var spid = pid.toString()
  return spid + padding[5 - spid.length] + ': '
}
