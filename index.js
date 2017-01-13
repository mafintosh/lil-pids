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
var active = []
var spawned = {}

fs.watch(filename, update)
update()

function update () {
  read(function (err, lines) {
    if (err) throw err

    var newOnes = []
    var oldOnes = []

    active.forEach(function (line) {
      if (lines.indexOf(line) > -1) return
      oldOnes.push(line)
    })

    lines.forEach(function (line) {
      // check if already active
      if (active.indexOf(line) > -1) return
      newOnes.push(line)
    })

    active = lines

    oldOnes.forEach(function (cmd) {
      spawned[cmd].stop()
      delete spawned[cmd]
    })

    newOnes.forEach(function (cmd) {
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
    })
  })
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
