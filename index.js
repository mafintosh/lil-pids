#!/usr/bin/env node

var fs = require('fs')
var respawn = require('respawn')

var filename = process.argv[2]

if (!filename) {
  console.error('Usage: lil-pid [services-file]')
  process.exit(1)
}

if (!fs.existsSync(filename)) {
  console.error(filename + ' does not exist')
  process.exit(2)
}

create(filename)

function create (filename) {
  var active = []
  var spawned = {}

  fs.watchFile(filename, update)
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

        var prefix = ''

        m.on('spawn', onspawn)
        m.on('exit', onexit)
        m.on('stdout', onlog)
        m.on('stderr', onlog)

        m.start()

        function onspawn () {
          updatePrefix()
          console.log('%s Spawning "%s"', prefix, cmd)
        }

        function onexit (code) {
          console.log('%s Command "%s" exited with %d', prefix, cmd, code)
        }

        function onlog (message) {
          var ln = message.toString().split('\n')
          for (var i = 0; i < ln.length; i++) ln[i] = prefix + ' ' + ln[i]
          console.log(ln.join('\n'))
        }

        function updatePrefix () {
          var pid = '' + m.pid
          while (pid.length < 5) pid = ' ' + pid
          prefix = '[' + pid + ']'
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
}

